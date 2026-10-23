using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Discovery.Application.Admin;
using Discovery.Application.Common;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Importing;

/// <summary>
/// Imports one product from its own official website: page title and description, logo and social
/// preview image. Images are downloaded into the local media store; nothing is hot-linked.
/// The crawler identifies itself, honours robots.txt and never connects to non-public addresses.
/// </summary>
public sealed partial class ProductImporter(
    AppDbContext db,
    AdminService admin,
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<ProductImporter> logger)
{
    public const string HttpClientName = "importer";
    public const string UserAgent = "Mozilla/5.0 (compatible; AlternivoBot/1.0; +https://alternivo.com/submit)";
    private const int MaxHtmlBytes = 1024 * 1024;
    private const int MaxImageBytes = 3 * 1024 * 1024;

    private string MediaRoot => config["Media:Path"] ?? "/app/media";

    private sealed record PageMeta(string? Name, string? Title, string? Description, string? OgImage, List<(string Url, int Size, bool Apple)> Icons);

    public async Task ProcessAsync(ImportItem item, CancellationToken ct)
    {
        if (!UrlSafety.IsSafePublicWebUrl(item.Url))
        {
            throw new ImportException("Not a public http(s) address.");
        }

        var http = httpFactory.CreateClient(HttpClientName);
        var baseUri = new Uri(item.Url);
        var notes = new List<string>();

        PageMeta? meta = null;
        if (await AllowedByRobotsAsync(http, baseUri, ct))
        {
            try
            {
                meta = await FetchPageAsync(http, baseUri, ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or ImportException)
            {
                notes.Add($"Page not readable ({Short(ex)}); used name and favicon only.");
            }
        }
        else
        {
            notes.Add("robots.txt disallows crawling; used name and favicon only.");
        }

        var name = Clean(item.Name) ?? Clean(meta?.Name) ?? NameFromTitle(meta?.Title) ?? baseUri.Host.Replace("www.", string.Empty);
        name = Truncate(name, 100);
        var description = Clean(meta?.Description);

        // Find or create the application.
        var host = UrlSafety.NormalizedHost(item.Url);
        var key = UrlSafety.ProductKey(item.Url);
        SoftwareApplication? app = null;
        if (item.ApplicationId is { } existingId)
        {
            app = await db.Applications.Include(a => a.Screenshots).FirstOrDefaultAsync(a => a.Id == existingId && a.DeletedAt == null, ct);
        }

        if (app is null && host is not null)
        {
            var candidates = await db.Applications.Include(a => a.Screenshots)
                .Where(a => a.DeletedAt == null && a.WebsiteUrl != null && a.WebsiteUrl.Contains(host)).ToListAsync(ct);
            app = candidates.FirstOrDefault(a => UrlSafety.ProductKey(a.WebsiteUrl) == key);
            if (app is not null) notes.Add("Already in the catalog; refreshed its images.");
        }

        if (app is null)
        {
            var category = item.CategorySlug is { } slug && await db.Categories.AnyAsync(c => c.Slug == slug, ct) ? slug : null;
            var id = await admin.UpsertApplicationAsync(item.RequestedByUserId, null, new UpsertApplicationRequest(
                name,
                await UniqueSlugAsync(name, ct),
                Truncate(description ?? $"{name} — description pending review.", 200),
                description,
                baseUri.GetLeftPart(UriPartial.Path),
                null, null, null, false, false, false, 0, null, category, null, null, null, null, null, false, null), ct);
            app = await db.Applications.Include(a => a.Screenshots).FirstAsync(a => a.Id == id, ct);
        }
        else if (app.Verification == VerificationStatus.Unverified && description is not null)
        {
            // Refresh text only on records an editor has not verified.
            app.ShortDescription = Truncate(description, 200);
            app.Description = description;
        }

        // Logo: page icons first, then the conventional locations, then the favicon service.
        var logoCandidates = (meta?.Icons ?? [])
            .OrderByDescending(i => i.Apple).ThenByDescending(i => i.Size)
            .Select(i => i.Url)
            .Append(new Uri(baseUri, "/apple-touch-icon.png").ToString())
            .Append(new Uri(baseUri, "/favicon.ico").ToString())
            .Append($"https://www.google.com/s2/favicons?domain={Uri.EscapeDataString(baseUri.Host)}&sz=256")
            .Distinct()
            .ToList();

        string? logo = null;
        foreach (var candidate in logoCandidates)
        {
            logo = await DownloadImageAsync(http, candidate, "logos", app.Slug, ct);
            if (logo is not null) break;
        }

        if (logo is not null)
        {
            // Same image ⇒ same content-hash file name: never delete the file we are about to keep.
            if (app.LogoUrl != logo) DeleteImported(app.LogoUrl, "logos");
            app.LogoUrl = logo;
        }
        else
        {
            notes.Add("No logo found.");
        }

        if (meta?.OgImage is { } og && await DownloadImageAsync(http, og, "shots", app.Slug, ct) is { } shot)
        {
            var size = ReadImageSize(Path.Combine(MediaRoot, "shots", Path.GetFileName(shot)));
            foreach (var old in app.Screenshots.Where(s => s.Url.StartsWith("/media/shots/")).ToList())
            {
                if (old.Url != shot) DeleteImported(old.Url, "shots");
                db.ApplicationScreenshots.Remove(old);
            }

            // Added through the DbSet: the client-generated key would otherwise be treated as an existing row.
            db.ApplicationScreenshots.Add(new ApplicationScreenshot
            {
                ApplicationId = app.Id,
                Url = shot,
                Caption = $"{app.Name} website",
                Width = size.Width,
                Height = size.Height,
                SortOrder = 0,
            });
        }

        app.UpdatedAt = DateTimeOffset.UtcNow;
        item.ApplicationId = app.Id;
        item.Name ??= name;
        item.Error = notes.Count > 0 ? string.Join(" ", notes) : null;
        await db.SaveChangesAsync(ct);
    }

    private async Task<string> UniqueSlugAsync(string name, CancellationToken ct)
    {
        var baseSlug = Slugs.Create(name);
        if (!Slugs.IsValid(baseSlug)) baseSlug = "app";
        var slug = baseSlug;
        for (var i = 2; await db.Applications.AnyAsync(a => a.Slug == slug, ct); i++)
        {
            slug = $"{baseSlug}-{i}";
        }

        return slug;
    }

    // ---------- Fetching ----------

    private async Task<bool> AllowedByRobotsAsync(HttpClient http, Uri site, CancellationToken ct)
    {
        try
        {
            using var response = await http.GetAsync(new Uri(site, "/robots.txt"), ct);
            if (!response.IsSuccessStatusCode) return true;
            var text = await ReadLimitedAsync(response, 256 * 1024, ct);
            return RobotsAllowsRoot(text);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or ImportException)
        {
            return true;
        }
    }

    /// <summary>True unless the group for our agent (or "*") disallows the whole site.</summary>
    public static bool RobotsAllowsRoot(string robots)
    {
        bool? specific = null, wildcard = null;
        var agents = new List<string>();
        var inRules = false;
        foreach (var raw in robots.Split('\n'))
        {
            var line = raw.Split('#')[0].Trim();
            var colon = line.IndexOf(':');
            if (colon < 0) continue;
            var key = line[..colon].Trim().ToLowerInvariant();
            var value = line[(colon + 1)..].Trim();
            if (key == "user-agent")
            {
                if (inRules) agents.Clear();
                inRules = false;
                agents.Add(value.ToLowerInvariant());
            }
            else if (key is "disallow" or "allow")
            {
                inRules = true;
                var blocksRoot = key == "disallow" && value == "/";
                foreach (var agent in agents)
                {
                    if (agent.Contains("alternivobot")) specific = (specific ?? false) || blocksRoot;
                    else if (agent == "*") wildcard = (wildcard ?? false) || blocksRoot;
                }
            }
        }

        return !(specific ?? wildcard ?? false);
    }

    private async Task<PageMeta> FetchPageAsync(HttpClient http, Uri url, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.ParseAdd("text/html,application/xhtml+xml");
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new ImportException($"HTTP {(int)response.StatusCode}");
        }

        var html = await ReadLimitedAsync(response, MaxHtmlBytes, ct);
        var pageUri = response.RequestMessage?.RequestUri ?? url;
        var headEnd = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        var head = headEnd > 0 ? html[..headEnd] : html;

        var metas = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in MetaTag().Matches(head))
        {
            var attrs = Attributes(m.Value);
            var key = attrs.GetValueOrDefault("property") ?? attrs.GetValueOrDefault("name");
            if (key is not null && attrs.TryGetValue("content", out var content) && !metas.ContainsKey(key))
            {
                metas[key] = WebUtility.HtmlDecode(content).Trim();
            }
        }

        var icons = new List<(string, int, bool)>();
        foreach (Match m in LinkTag().Matches(head))
        {
            var attrs = Attributes(m.Value);
            var rel = attrs.GetValueOrDefault("rel")?.ToLowerInvariant() ?? string.Empty;
            if (!rel.Contains("icon") || !attrs.TryGetValue("href", out var href) || href.StartsWith("data:")) continue;
            if (!Uri.TryCreate(pageUri, WebUtility.HtmlDecode(href), out var iconUri)) continue;
            var sizeText = attrs.GetValueOrDefault("sizes") ?? string.Empty;
            var size = sizeText.Equals("any", StringComparison.OrdinalIgnoreCase) || iconUri.AbsolutePath.EndsWith(".svg")
                ? 512
                : int.TryParse(sizeText.Split('x', 'X')[0], out var px) ? px : 32;
            icons.Add((iconUri.ToString(), size, rel.Contains("apple-touch-icon")));
        }

        var title = TitleTag().Match(head) is { Success: true } t ? WebUtility.HtmlDecode(t.Groups[1].Value).Trim() : null;
        var description = new[] { metas.GetValueOrDefault("og:description"), metas.GetValueOrDefault("description"), metas.GetValueOrDefault("twitter:description") }
            .Select(Clean).Where(d => d is { Length: >= 20 }).OrderByDescending(d => d!.Length).FirstOrDefault();
        var ogImage = metas.GetValueOrDefault("og:image") ?? metas.GetValueOrDefault("twitter:image");
        if (ogImage is not null && Uri.TryCreate(pageUri, ogImage, out var ogUri)) ogImage = ogUri.ToString();

        return new PageMeta(metas.GetValueOrDefault("og:site_name") ?? metas.GetValueOrDefault("application-name"), title, description, ogImage, icons);
    }

    private static async Task<string> ReadLimitedAsync(HttpResponseMessage response, int limit, CancellationToken ct)
    {
        var bytes = await ReadBytesLimitedAsync(response, limit, ct);
        return Encoding.UTF8.GetString(bytes);
    }

    private static async Task<byte[]> ReadBytesLimitedAsync(HttpResponseMessage response, int limit, CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var buffer = new MemoryStream();
        var chunk = new byte[16 * 1024];
        int read;
        while ((read = await stream.ReadAsync(chunk, ct)) > 0)
        {
            buffer.Write(chunk, 0, read);
            if (buffer.Length > limit)
            {
                if (limit == MaxHtmlBytes) break; // the head is all we need
                throw new ImportException("File too large.");
            }
        }

        return buffer.ToArray();
    }

    private async Task<string?> DownloadImageAsync(HttpClient http, string url, string folder, string slug, CancellationToken ct)
    {
        if (!UrlSafety.IsSafePublicWebUrl(url)) return null;
        try
        {
            using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode) return null;
            var bytes = await ReadBytesLimitedAsync(response, MaxImageBytes, ct);
            var ext = DetectImage(bytes);
            if (ext is null || bytes.Length < 100) return null;

            var dir = Path.Combine(MediaRoot, folder);
            Directory.CreateDirectory(dir);
            var hash = Convert.ToHexString(SHA256.HashData(bytes))[..10].ToLowerInvariant();
            var file = $"{slug}-{hash}{ext}";
            var path = Path.Combine(dir, file);
            if (!File.Exists(path)) await File.WriteAllBytesAsync(path, bytes, ct);
            return $"/media/{folder}/{file}";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or ImportException or IOException)
        {
            logger.LogDebug(ex, "Image download failed for {Url}", url);
            return null;
        }
    }

    private void DeleteImported(string? url, string folder)
    {
        if (url is null || !url.StartsWith($"/media/{folder}/")) return;
        var path = Path.Combine(MediaRoot, folder, Path.GetFileName(url));
        try
        {
            if (File.Exists(path)) File.Delete(path);
        }
        catch (IOException)
        {
            // Best effort; an orphaned file is harmless.
        }
    }

    // ---------- Image helpers ----------

    /// <summary>Returns the extension for a recognised image signature, or null.</summary>
    public static string? DetectImage(byte[] b)
    {
        if (b.Length < 12) return null;
        if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return ".png";
        if (b[0] == 0xFF && b[1] == 0xD8) return ".jpg";
        if (b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46) return ".gif";
        if (b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 && b[8] == 0x57 && b[9] == 0x45) return ".webp";
        if (b[0] == 0x00 && b[1] == 0x00 && b[2] == 0x01 && b[3] == 0x00) return ".ico";
        var start = Encoding.UTF8.GetString(b, 0, Math.Min(b.Length, 512)).TrimStart('﻿', ' ', '\n', '\r', '\t');
        if ((start.StartsWith("<svg") || start.StartsWith("<?xml")) && start.Contains("<svg")) return ".svg";
        return null;
    }

    private static (int Width, int Height) ReadImageSize(string path)
    {
        try
        {
            var b = File.ReadAllBytes(path);
            if (b.Length > 24 && b[0] == 0x89 && b[1] == 0x50)
                return ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]);
            if (b.Length > 10 && b[0] == 0x47 && b[1] == 0x49)
                return (b[6] | (b[7] << 8), b[8] | (b[9] << 8));
            if (b.Length > 30 && b[0] == 0x52 && b[12] == 0x56 && b[13] == 0x50 && b[14] == 0x38)
            {
                if (b[15] == 0x58) return (1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
                if (b[15] == 0x20) return ((b[26] | (b[27] << 8)) & 0x3FFF, (b[28] | (b[29] << 8)) & 0x3FFF);
                if (b[15] == 0x4C) return (1 + (((b[22] & 0x3F) << 8) | b[21]), 1 + (((b[24] & 0x0F) << 10) | (b[23] << 2) | ((b[22] & 0xC0) >> 6)));
            }

            if (b.Length > 4 && b[0] == 0xFF && b[1] == 0xD8)
            {
                var i = 2;
                while (i + 9 < b.Length)
                {
                    if (b[i] != 0xFF) { i++; continue; }
                    var marker = b[i + 1];
                    var len = (b[i + 2] << 8) | b[i + 3];
                    if (marker is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC)
                        return ((b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]);
                    i += 2 + len;
                }
            }
        }
        catch (IOException)
        {
        }

        return (1200, 630);
    }

    // ---------- Text helpers ----------

    private static Dictionary<string, string> Attributes(string tag)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match a in AttributePattern().Matches(tag))
        {
            result.TryAdd(a.Groups[1].Value, a.Groups[3].Success ? a.Groups[3].Value : a.Groups[4].Value);
        }

        return result;
    }

    private static string? NameFromTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var first = TitleSeparator().Split(title)[0].Trim();
        return first.Length >= 2 ? first : title.Trim();
    }

    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = Whitespace().Replace(WebUtility.HtmlDecode(value), " ").Trim();
        return v.Length == 0 ? null : v;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)].TrimEnd() + "…";

    private static string Short(Exception ex) => ex is TaskCanceledException ? "timeout" : ex.Message.Length > 80 ? ex.Message[..80] : ex.Message;

    [GeneratedRegex(@"<meta\s[^>]*>", RegexOptions.IgnoreCase)]
    private static partial Regex MetaTag();

    [GeneratedRegex(@"<link\s[^>]*>", RegexOptions.IgnoreCase)]
    private static partial Regex LinkTag();

    [GeneratedRegex(@"<title[^>]*>([^<]{1,300})</title>", RegexOptions.IgnoreCase)]
    private static partial Regex TitleTag();

    [GeneratedRegex(@"([a-zA-Z:-]+)\s*=\s*(""([^""]*)""|'([^']*)')")]
    private static partial Regex AttributePattern();

    [GeneratedRegex(@"\s+[|–—·:-]\s+")]
    private static partial Regex TitleSeparator();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    /// <summary>HTTP handler that refuses to connect to private, loopback or link-local addresses (SSRF guard).</summary>
    public static SocketsHttpHandler CreateHandler() => new()
    {
        AllowAutoRedirect = true,
        MaxAutomaticRedirections = 5,
        AutomaticDecompression = DecompressionMethods.All,
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        ConnectCallback = async (context, ct) =>
        {
            var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
            var target = addresses.FirstOrDefault(UrlSafety.IsPublicAddress)
                ?? throw new HttpRequestException("Host resolves to a non-public address.");
            if (addresses.Any(a => !UrlSafety.IsPublicAddress(a)))
                throw new HttpRequestException("Host resolves to a non-public address.");
            var socket = new Socket(target.AddressFamily, SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
            try
            {
                await socket.ConnectAsync(new IPEndPoint(target, context.DnsEndPoint.Port), ct);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        },
    };
}

public sealed class ImportException(string message) : Exception(message);
