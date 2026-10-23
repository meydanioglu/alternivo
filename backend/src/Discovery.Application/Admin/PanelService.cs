using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

public sealed record TrackPageViewRequest(string Path, string? Referrer);

public sealed record DailyTraffic(DateOnly Date, int Views, int Visitors);

public sealed record CountRow(string Key, int Count);

public sealed record RecentView(string Path, string? ReferrerHost, string Device, bool SignedIn, DateTimeOffset At);

public sealed record AnalyticsDto(
    int Days,
    int Views,
    int Visitors,
    int ViewsToday,
    int VisitorsToday,
    int ActiveNow,
    IReadOnlyList<DailyTraffic> Daily,
    IReadOnlyList<CountRow> TopPages,
    IReadOnlyList<CountRow> TopReferrers,
    IReadOnlyList<CountRow> Devices,
    IReadOnlyList<RecentView> Recent);

public sealed record AdminApplicationDetail(
    Guid Id,
    string Status,
    uint Version,
    string Name,
    string Slug,
    string ShortDescription,
    string? Description,
    string? WebsiteUrl,
    string? LogoUrl,
    string? Developer,
    string[] Pricing,
    string? LicenseSlug,
    bool IsSelfHostable,
    bool IsPrivacyFocused,
    bool HasOfflineSupport,
    int EditorialScore,
    DateOnly? ReleasedOn,
    string? PrimaryCategorySlug,
    string[] CategorySlugs,
    string[] PlatformSlugs,
    string[] FeatureSlugs,
    string[] TagSlugs,
    string[] Aliases);

public sealed record AdminCategoryRow(
    Guid Id,
    string Slug,
    string Name,
    string? Description,
    string? ParentSlug,
    string? Icon,
    bool IsFeatured,
    int SortOrder,
    int ApplicationCount);

public sealed record UpsertCategoryRequest(
    string Name,
    string? Slug,
    string? Description,
    string? ParentSlug,
    string? Icon,
    bool IsFeatured,
    int SortOrder);

/// <summary>Admin panel: visitor analytics, application editing data and category management.</summary>
public sealed class PanelService(IAppDbContext db, ICacheService cache, TimeProvider clock)
{
    private static readonly string[] BotMarkers =
        ["bot", "crawl", "spider", "slurp", "preview", "headless", "lighthouse", "curl", "wget", "python", "monitor"];

    // ---------- Analytics ----------

    /// <summary>Records a page view. Returns false when ignored (bots, admin pages, malformed paths).</summary>
    public async Task<bool> TrackAsync(TrackPageViewRequest request, string clientIp, string? userAgent, Guid? userId, string secret, CancellationToken ct)
    {
        var path = request.Path?.Trim() ?? string.Empty;
        var ua = userAgent ?? string.Empty;
        if (path.Length is 0 or > 300 || !path.StartsWith('/') || path.StartsWith("/admin") || path.StartsWith("/bff")
            || BotMarkers.Any(m => ua.Contains(m, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        var now = clock.GetUtcNow();
        var raw = $"{secret}|{now:yyyy-MM-dd}|{clientIp}|{ua}";
        var visitor = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)))[..32].ToLowerInvariant();

        string? referrer = null;
        if (Uri.TryCreate(request.Referrer, UriKind.Absolute, out var refUri) && refUri.Scheme is "http" or "https")
        {
            referrer = refUri.Host.StartsWith("www.") ? refUri.Host[4..] : refUri.Host;
        }

        db.PageViews.Add(new PageView
        {
            Path = path.Split('?')[0],
            ReferrerHost = referrer?.Length > 200 ? referrer[..200] : referrer,
            VisitorId = visitor,
            Device = DeviceOf(ua),
            UserId = userId,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static string DeviceOf(string ua) =>
        ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) || ua.Contains("Tablet", StringComparison.OrdinalIgnoreCase) ? "tablet"
        : ua.Contains("Mobi", StringComparison.OrdinalIgnoreCase) || ua.Contains("Android", StringComparison.OrdinalIgnoreCase) ? "mobile"
        : "desktop";

    public async Task<AnalyticsDto> AnalyticsAsync(int days, string? ownHost, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, 365);
        var now = clock.GetUtcNow();
        var today = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var from = today.AddDays(-(days - 1));
        var range = db.PageViews.Where(v => v.CreatedAt >= from);

        var daily = await range
            .GroupBy(v => v.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Views = g.Count(), Visitors = g.Select(v => v.VisitorId).Distinct().Count() })
            .ToListAsync(ct);
        var byDate = daily.ToDictionary(d => DateOnly.FromDateTime(d.Date));
        var series = Enumerable.Range(0, days)
            .Select(i => DateOnly.FromDateTime(from.AddDays(i).UtcDateTime))
            .Select(d => byDate.TryGetValue(d, out var x) ? new DailyTraffic(d, x.Views, x.Visitors) : new DailyTraffic(d, 0, 0))
            .ToList();

        var todayRow = series[^1];
        var visitors = await range.Select(v => v.VisitorId).Distinct().CountAsync(ct);
        var activeNow = await db.PageViews.Where(v => v.CreatedAt >= now.AddMinutes(-5)).Select(v => v.VisitorId).Distinct().CountAsync(ct);

        var topPages = await range.GroupBy(v => v.Path)
            .Select(g => new CountRow(g.Key, g.Count())).OrderByDescending(x => x.Count).Take(15).ToListAsync(ct);
        var topReferrers = await range.Where(v => v.ReferrerHost != null && v.ReferrerHost != ownHost)
            .GroupBy(v => v.ReferrerHost!)
            .Select(g => new CountRow(g.Key, g.Count())).OrderByDescending(x => x.Count).Take(10).ToListAsync(ct);
        var devices = await range.GroupBy(v => v.Device)
            .Select(g => new CountRow(g.Key, g.Count())).OrderByDescending(x => x.Count).ToListAsync(ct);
        var recent = await db.PageViews.OrderByDescending(v => v.Id).Take(30)
            .Select(v => new RecentView(v.Path, v.ReferrerHost, v.Device, v.UserId != null, v.CreatedAt)).ToListAsync(ct);

        return new AnalyticsDto(days, series.Sum(d => d.Views), visitors, todayRow.Views, todayRow.Visitors, activeNow,
            series, topPages, topReferrers, devices, recent);
    }

    // ---------- Applications ----------

    public async Task<AdminApplicationDetail> GetApplicationAsync(Guid id, CancellationToken ct)
    {
        var a = await db.Applications
            .Include(x => x.License)
            .Include(x => x.Categories).ThenInclude(c => c.Category)
            .Include(x => x.Platforms).ThenInclude(p => p.Platform)
            .Include(x => x.Features).ThenInclude(f => f.Feature)
            .Include(x => x.Tags).ThenInclude(t => t.Tag)
            .Include(x => x.Aliases)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, ct)
            ?? throw new NotFoundException("Application", id.ToString());

        return new AdminApplicationDetail(
            a.Id, a.Status.ToString(), a.Version, a.Name, a.Slug, a.ShortDescription, a.Description, a.WebsiteUrl, a.LogoUrl,
            a.Developer, PricingNames.ToNames(a.Pricing), a.License?.Slug, a.IsSelfHostable, a.IsPrivacyFocused,
            a.HasOfflineSupport, a.EditorialScore, a.ReleasedOn,
            a.Categories.FirstOrDefault(c => c.IsPrimary)?.Category?.Slug,
            a.Categories.Select(c => c.Category!.Slug).ToArray(),
            a.Platforms.Select(p => p.Platform!.Slug).ToArray(),
            a.Features.Select(f => f.Feature!.Slug).ToArray(),
            a.Tags.Select(t => t.Tag!.Slug).ToArray(),
            a.Aliases.Select(x => x.Alias).ToArray());
    }

    // ---------- Categories ----------

    public async Task<IReadOnlyList<AdminCategoryRow>> ListCategoriesAsync(CancellationToken ct) =>
        await db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new AdminCategoryRow(c.Id, c.Slug, c.Name, c.Description, c.Parent == null ? null : c.Parent.Slug,
                c.Icon, c.IsFeatured, c.SortOrder, c.Applications.Count))
            .ToListAsync(ct);

    public async Task<Guid> UpsertCategoryAsync(Guid actorId, Guid? id, UpsertCategoryRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Length > 80)
            throw new BadRequestException("Name is required (max 80 characters).");
        if (r.Description is { Length: > 500 })
            throw new BadRequestException("Description must be at most 500 characters.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugs.Create(r.Name) : r.Slug.Trim();
        if (!Slugs.IsValid(slug))
            throw new BadRequestException("Invalid slug.");

        Category category;
        if (id is { } existing)
        {
            category = await db.Categories.FirstOrDefaultAsync(c => c.Id == existing, ct)
                ?? throw new NotFoundException("Category", existing.ToString());
        }
        else
        {
            category = new Category { Slug = slug, Name = r.Name };
            db.Categories.Add(category);
        }

        if (await db.Categories.AnyAsync(c => c.Slug == slug && c.Id != category.Id, ct))
            throw new ConflictException($"The slug '{slug}' is already used.");

        Guid? parentId = null;
        if (!string.IsNullOrWhiteSpace(r.ParentSlug))
        {
            var parent = await db.Categories.FirstOrDefaultAsync(c => c.Slug == r.ParentSlug, ct)
                ?? throw new BadRequestException($"Unknown parent category '{r.ParentSlug}'.");
            if (parent.Id == category.Id || parent.ParentId == category.Id)
                throw new BadRequestException("A category cannot be its own parent.");
            parentId = parent.Id;
        }

        category.Slug = slug;
        category.Name = r.Name.Trim();
        category.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        category.ParentId = parentId;
        category.Icon = string.IsNullOrWhiteSpace(r.Icon) ? null : r.Icon.Trim();
        category.IsFeatured = r.IsFeatured;
        category.SortOrder = r.SortOrder;
        category.UpdatedAt = clock.GetUtcNow();
        Audit(actorId, id is null ? "category.create" : "category.update", category.Id, new { slug });
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return category.Id;
    }

    public async Task DeleteCategoryAsync(Guid actorId, Guid id, CancellationToken ct)
    {
        var category = await db.Categories.Include(c => c.Applications).Include(c => c.Children)
            .FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw new NotFoundException("Category", id.ToString());
        if (category.Applications.Count > 0 || category.Children.Count > 0)
            throw new ConflictException("Move its applications and subcategories elsewhere before deleting this category.");
        db.Categories.Remove(category);
        Audit(actorId, "category.delete", id, new { category.Slug });
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

    private void Audit(Guid actorId, string action, Guid entityId, object data) =>
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = action,
            EntityType = "Category",
            EntityId = entityId,
            DataJson = JsonSerializer.Serialize(data),
        });

    private async Task InvalidateAsync(CancellationToken ct)
    {
        await cache.RemoveAsync(CacheKeys.Categories, ct);
        await cache.RemoveAsync(CacheKeys.Home, ct);
    }
}
