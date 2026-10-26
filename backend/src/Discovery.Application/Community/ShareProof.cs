using System.Text.RegularExpressions;

namespace Discovery.Application.Community;

/// <summary>Pure checks for the "share Alternivo, get a faster free review" proofs.</summary>
public static partial class ShareProof
{
    /// <summary>True when the HTML has a link to alternivo.com (any page, http or https, with or without www).</summary>
    public static bool BadgeLinked(string? html) => html is not null && AlternivoLink().IsMatch(html);

    /// <summary>A public post URL on X (a /status/ link) or Substack (a note or post); https only.</summary>
    public static bool PostUrlValid(string? url)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps) return false;
        var host = u.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal)) host = host[4..];
        return host switch
        {
            "x.com" or "twitter.com" or "mobile.twitter.com" => XStatus().IsMatch(u.AbsolutePath),
            "substack.com" => u.AbsolutePath.Length > 1,
            _ => host.EndsWith(".substack.com", StringComparison.Ordinal) && u.AbsolutePath.Length > 1,
        };
    }

    /// <summary>The new free-review deadline after a valid proof: never later than before, never in the past.</summary>
    public static DateTimeOffset SharedDeadline(DateTimeOffset createdAt, DateTimeOffset? current, DateTimeOffset now, int days)
    {
        var target = createdAt.AddDays(days);
        if (target < now.AddDays(1)) target = now.AddDays(1);
        return current is { } c && c < target ? c : target;
    }

    [GeneratedRegex(@"href\s*=\s*[""']?https?://(www\.)?alternivo\.com(/|[""'\s>])", RegexOptions.IgnoreCase)]
    private static partial Regex AlternivoLink();

    [GeneratedRegex(@"^/[A-Za-z0-9_]{1,15}/status/\d+")]
    private static partial Regex XStatus();
}
