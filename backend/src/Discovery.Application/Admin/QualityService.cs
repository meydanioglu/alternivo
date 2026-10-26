using System.Text.Json;
using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

/// <summary>error = confirmed problem; review = needs a human to check; info = improvement opportunity.</summary>
public sealed record QualityIssueDto(string Severity, string Type, string Slug, string Name, string Detail);

public sealed record PageScoreDto(string Slug, string Name, int Score, IReadOnlyList<string> Missing);

public sealed record QualityReportDto(
    DateTimeOffset GeneratedAt,
    IReadOnlyDictionary<string, int> IssueCounts,
    IReadOnlyList<QualityIssueDto> Issues,
    double AverageScore,
    IReadOnlyList<PageScoreDto> LowestScores);

public sealed record SeoMetricsDto(
    int PublishedApps,
    int IndexableApps,
    int Categories,
    int IndexableCategories,
    int Relationships,
    int CuratedRelationships,
    int ContentPending,
    int Errors,
    int Reviews,
    double AverageScore,
    int OrganicVisits,
    int TotalVisits);

public sealed record LandingPageDto(string Path, int Last7, int Previous7, int Change);

public sealed record DailySeoReportDto(
    DateOnly Day,
    SeoMetricsDto Today,
    SeoMetricsDto? Yesterday,
    SeoMetricsDto? WeekAgo,
    SeoMetricsDto? MonthAgo,
    IReadOnlyList<LandingPageDto> Gainers,
    IReadOnlyList<LandingPageDto> Losers,
    IReadOnlyList<string> Tasks,
    string Note);

/// <summary>
/// Read-only data-quality and page-quality checks over the catalog, plus a daily internal SEO snapshot.
/// Nothing here changes catalog records: it reports suspicious data for an editor to confirm.
/// The page score is an internal prioritisation aid, not a search-engine ranking factor.
/// </summary>
public sealed class QualityService(IAppDbContext db, TimeProvider clock)
{
    private static readonly string[] SearchEngines = ["google.", "bing.", "duckduckgo.", "yandex.", "yahoo.", "ecosia.", "brave."];
    private const int MinAlternatives = 3;
    private const int StaleDays = 180;

    private sealed record Row(
        Guid Id, string Slug, string Name, string ShortDescription, string? Description, string? WebsiteUrl, string? LogoUrl,
        string? ContentJson, DateTimeOffset? ContentApprovedAt, bool NeedsContentReview, PricingModel Pricing,
        DateTimeOffset? LastVerifiedAt, int Platforms, int Categories, bool HasPrimary);

    public async Task<QualityReportDto> ReportAsync(CancellationToken ct)
    {
        var (issues, scores) = await AnalyseAsync(ct);
        var counts = issues.GroupBy(i => i.Severity).ToDictionary(g => g.Key, g => g.Count());
        foreach (var g in issues.GroupBy(i => i.Type)) counts[$"type:{g.Key}"] = g.Count();
        return new QualityReportDto(clock.GetUtcNow(), counts,
            issues.OrderBy(i => i.Severity switch { "error" => 0, "review" => 1, _ => 2 }).ThenBy(i => i.Type).ThenBy(i => i.Slug).ToList(),
            scores.Count == 0 ? 0 : Math.Round(scores.Average(s => s.Score), 1),
            scores.OrderBy(s => s.Score).ThenBy(s => s.Slug).Take(100).ToList());
    }

    private async Task<(List<QualityIssueDto> Issues, List<PageScoreDto> Scores)> AnalyseAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var apps = await db.Applications.AsNoTracking()
            .Where(a => a.Status == PublicationStatus.Published && a.DeletedAt == null)
            .Select(a => new Row(a.Id, a.Slug, a.Name, a.ShortDescription, a.Description, a.WebsiteUrl, a.LogoUrl, a.ContentJson,
                a.ContentApprovedAt, a.NeedsContentReview, a.Pricing, a.LastVerifiedAt, a.Platforms.Count, a.Categories.Count,
                a.Categories.Any(c => c.IsPrimary)))
            .ToListAsync(ct);
        var ids = apps.Select(a => a.Id).ToHashSet();

        var relationships = await db.AlternativeRelationships.AsNoTracking()
            .Where(r => r.Status == ModerationStatus.Approved)
            .Select(r => new { r.SourceApplicationId, r.AlternativeApplicationId, r.Source })
            .ToListAsync(ct);
        var altCount = relationships.Where(r => ids.Contains(r.AlternativeApplicationId))
            .GroupBy(r => r.SourceApplicationId).ToDictionary(g => g.Key, g => g.Count());
        var curated = relationships.Where(r => r.Source != RelationshipSource.Import)
            .GroupBy(r => r.SourceApplicationId).ToDictionary(g => g.Key, g => g.Count());
        var importErrors = await db.ImportItems.AsNoTracking()
            .Where(i => i.ApplicationId != null && i.Error != null && (i.Error.Contains("not readable") || i.Error.Contains("HTTP 4")))
            .Select(i => new { Id = i.ApplicationId!.Value, i.Error })
            .ToListAsync(ct);

        var issues = new List<QualityIssueDto>();
        void Add(string severity, string type, Row a, string detail) => issues.Add(new QualityIssueDto(severity, type, a.Slug, a.Name, detail));

        // Identity: one product per official site, one product per name.
        foreach (var g in apps.Where(a => DomainKey(a.WebsiteUrl) is not null).GroupBy(a => DomainKey(a.WebsiteUrl)!).Where(g => g.Count() > 1))
            foreach (var a in g)
                Add("review", "duplicate-domain", a, $"Shares {g.Key} with {string.Join(", ", g.Where(x => x != a).Select(x => x.Slug))}");
        foreach (var g in apps.GroupBy(a => NormalizeName(a.Name)).Where(g => g.Key.Length > 0 && g.Count() > 1))
            foreach (var a in g)
                Add("error", "duplicate-name", a, $"Same normalised name as {string.Join(", ", g.Where(x => x != a).Select(x => x.Slug))}");
        foreach (var g in apps.GroupBy(a => BrandStem(a.Name)).Where(g => g.Key.Length >= 4 && g.Count() > 1))
            foreach (var a in g)
            {
                // Same company (shared registrable domain) is a product family, not a confusable brand.
                var others = g.Where(x => x != a
                    && RegistrableDomain(HostOf(x.WebsiteUrl)) != RegistrableDomain(HostOf(a.WebsiteUrl))
                    && !IsConfirmedDistinct(a.Slug, x.Slug)).ToList();
                if (others.Count > 0)
                    Add("review", "similar-brand", a, $"Similar name to {string.Join(", ", others.Select(x => $"{x.Slug} ({HostOf(x.WebsiteUrl)})"))} on another company's site — make sure lists and links use the right one");
            }
        foreach (var a in apps.Where(a => System.Text.RegularExpressions.Regex.IsMatch(a.Slug, @"-\d+$")
                     && !a.Name.TrimEnd().EndsWith(a.Slug[(a.Slug.LastIndexOf('-') + 1)..], StringComparison.Ordinal)))
            Add("review", "suffixed-slug", a, "Slug ends with a numeric suffix, which usually means a duplicate import");

        foreach (var a in apps)
        {
            var host = HostOf(a.WebsiteUrl);
            if (host is null) Add("review", "missing-website", a, "No official website URL");
            else if (!BrandMatchesHost(a.Name, a.Slug, host)) Add("review", "brand-domain-mismatch", a, $"Name does not appear in the official domain {host}");
            if (!a.HasPrimary) Add("error", "no-primary-category", a, "No primary category (breadcrumbs, related lists and alternatives depend on it)");
            if (a.ShortDescription.Contains("pending review", StringComparison.OrdinalIgnoreCase) || a.ShortDescription.Length < 40)
                Add("error", "placeholder-description", a, $"Short description is a placeholder or too short: \"{a.ShortDescription}\"");
            if (a.Pricing == PricingModel.None) Add("review", "unknown-pricing", a, "Pricing model not set");
            if (a.Platforms == 0) Add("review", "no-platforms", a, "No supported platforms recorded");
            if (string.IsNullOrEmpty(a.LogoUrl)) Add("info", "no-logo", a, "No logo");
            var alts = altCount.GetValueOrDefault(a.Id);
            if (alts == 0) Add("review", "no-alternatives", a, "Alternatives page is empty");
            else if (curated.GetValueOrDefault(a.Id) == 0) Add("info", "only-automatic-alternatives", a, $"All {alts} alternatives come from automatic same-category matching; curate the best ones");
            if (a.LastVerifiedAt is null || a.LastVerifiedAt < now.AddDays(-StaleDays))
                Add("info", "stale-verification", a, a.LastVerifiedAt is null ? "Never verified" : $"Last verified {a.LastVerifiedAt:yyyy-MM-dd}");
            if (a.NeedsContentReview) Add("info", "content-not-approved", a, "Imported content not reviewed yet (page is noindex)");
        }

        foreach (var e in importErrors)
        {
            var a = apps.FirstOrDefault(x => x.Id == e.Id);
            if (a is not null) Add("review", "website-unreachable", a, e.Error!.Length > 160 ? e.Error[..160] : e.Error);
        }

        var categories = await db.Categories.AsNoTracking()
            .Select(c => new { c.Slug, c.Name, Apps = db.ApplicationCategories.Count(x => x.CategoryId == c.Id && ids.Contains(x.ApplicationId)) })
            .ToListAsync(ct);
        foreach (var c in categories.Where(c => c.Apps < 3))
            issues.Add(new QualityIssueDto("info", c.Apps == 0 ? "empty-category" : "thin-category", c.Slug, c.Name,
                $"{c.Apps} published products (category pages need 3 to be indexed)"));

        var scores = apps.Select(a => Score(a, altCount.GetValueOrDefault(a.Id), now)).ToList();
        return (issues, scores);
    }

    /// <summary>Completeness score for a product page (0-100) and what is missing.</summary>
    private static PageScoreDto Score(Row a, int alternatives, DateTimeOffset now)
    {
        var missing = new List<string>();
        var score = 0;
        var sections = ContentJson.Parse(a.ContentJson);
        void Check(bool ok, int points, string label)
        {
            if (ok) score += points;
            else missing.Add(label);
        }

        Check(a.ContentApprovedAt is not null && !a.NeedsContentReview, 25, "approved content");
        Check((a.Description ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries).Length >= 150, 15, "description of 150+ words");
        Check(sections?.Features.Count >= 3, 15, "3+ features");
        Check(sections?.Faq.Count >= 3, 10, "3+ FAQs");
        Check(a.Platforms > 0, 10, "platforms");
        Check(alternatives >= MinAlternatives, 10, $"{MinAlternatives}+ alternatives");
        Check(a.Pricing != PricingModel.None, 5, "pricing");
        Check(!string.IsNullOrEmpty(a.LogoUrl), 5, "logo");
        Check(a.LastVerifiedAt > now.AddDays(-StaleDays), 5, "verified in last 6 months");
        return new PageScoreDto(a.Slug, a.Name, score, missing);
    }

    // ---------- Daily SEO snapshot ----------

    public async Task<SeoMetricsDto> MetricsAsync(DateOnly day, CancellationToken ct)
    {
        var (issues, scores) = await AnalyseAsync(ct);
        var from = new DateTimeOffset(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var to = from.AddDays(1);
        var views = await db.PageViews.AsNoTracking().Where(v => v.CreatedAt >= from && v.CreatedAt < to)
            .Select(v => v.ReferrerHost).ToListAsync(ct);
        var published = await db.Applications.CountAsync(a => a.Status == PublicationStatus.Published && a.DeletedAt == null, ct);
        var indexable = await db.Applications.CountAsync(a => a.Status == PublicationStatus.Published && a.DeletedAt == null && !a.NeedsContentReview, ct);
        var categories = await db.Categories.CountAsync(ct);
        var indexableCategories = await db.Categories.CountAsync(c =>
            db.ApplicationCategories.Count(x => x.CategoryId == c.Id && x.Application!.Status == PublicationStatus.Published && x.Application.DeletedAt == null) >= 3, ct);
        var rel = await db.AlternativeRelationships.CountAsync(r => r.Status == ModerationStatus.Approved, ct);
        var curatedRel = await db.AlternativeRelationships.CountAsync(r => r.Status == ModerationStatus.Approved && r.Source != RelationshipSource.Import, ct);
        var pending = await db.ContentDrafts.CountAsync(d => d.Status == ContentDraftStatus.Ready || d.Status == ContentDraftStatus.Queued, ct);
        return new SeoMetricsDto(published, indexable, categories, indexableCategories, rel, curatedRel, pending,
            issues.Count(i => i.Severity == "error"), issues.Count(i => i.Severity == "review"),
            scores.Count == 0 ? 0 : Math.Round(scores.Average(s => s.Score), 1),
            views.Count(IsOrganic), views.Count);
    }

    public static bool IsOrganic(string? referrerHost) =>
        referrerHost is not null && SearchEngines.Any(e => referrerHost.Contains(e, StringComparison.OrdinalIgnoreCase));

    /// <summary>Stores today's snapshot once; called by the background scheduler.</summary>
    public async Task<bool> SnapshotAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (await db.SeoSnapshots.AnyAsync(s => s.Day == today, ct)) return false;
        // Organic visits are counted for the previous, complete day.
        var metrics = await MetricsAsync(today.AddDays(-1), ct);
        db.SeoSnapshots.Add(new SeoSnapshot { Day = today, MetricsJson = JsonSerializer.Serialize(metrics), CreatedAt = clock.GetUtcNow() });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<DailySeoReportDto> DailyReportAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var current = await MetricsAsync(today.AddDays(-1), ct);
        var snaps = await db.SeoSnapshots.AsNoTracking().Where(s => s.Day >= today.AddDays(-29)).ToListAsync(ct);
        SeoMetricsDto? At(int daysAgo) => snaps.Where(s => s.Day <= today.AddDays(-daysAgo)).OrderByDescending(s => s.Day)
            .Select(s => JsonSerializer.Deserialize<SeoMetricsDto>(s.MetricsJson)).FirstOrDefault();

        // Organic landing pages: last 7 complete days vs the 7 before (referrer-based, our own first-party counter).
        var end = new DateTimeOffset(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var rows = await db.PageViews.AsNoTracking()
            .Where(v => v.CreatedAt >= end.AddDays(-14) && v.CreatedAt < end && v.ReferrerHost != null)
            .Select(v => new { v.Path, v.ReferrerHost, v.CreatedAt })
            .ToListAsync(ct);
        var landing = rows.Where(r => IsOrganic(r.ReferrerHost)).GroupBy(r => r.Path)
            .Select(g => new LandingPageDto(g.Key, g.Count(r => r.CreatedAt >= end.AddDays(-7)), g.Count(r => r.CreatedAt < end.AddDays(-7)), 0))
            .Select(l => l with { Change = l.Last7 - l.Previous7 })
            .ToList();

        var report = await ReportAsync(ct);
        var tasks = new List<string>();
        int Count(string type) => report.IssueCounts.GetValueOrDefault($"type:{type}");
        if (report.IssueCounts.GetValueOrDefault("error") > 0)
            tasks.Add($"Fix {report.IssueCounts["error"]} confirmed data errors (duplicate names, placeholder descriptions, missing primary categories).");
        if (current.ContentPending > 0)
            tasks.Add($"Review and approve {current.ContentPending} content drafts — approved products become indexable.");
        if (Count("only-automatic-alternatives") > 0)
            tasks.Add($"Curate alternatives for high-traffic products: {Count("only-automatic-alternatives")} products rely only on automatic same-category matches.");
        if (Count("similar-brand") > 0)
            tasks.Add($"Check {Count("similar-brand")} products with similar brand names on different sites (product identity).");
        if (Count("no-alternatives") > 0)
            tasks.Add($"Add alternatives to {Count("no-alternatives")} products with empty alternatives pages.");

        return new DailySeoReportDto(today, current, At(1), At(7), At(28),
            landing.Where(l => l.Change > 0).OrderByDescending(l => l.Change).Take(10).ToList(),
            landing.Where(l => l.Change < 0).OrderBy(l => l.Change).Take(10).ToList(),
            tasks.Take(3).ToList(),
            "Organic visits are first-party page views with a search-engine referrer, not Google Search Console data. " +
            "Published or indexable counts are our own and are not Google's indexed-page count.");
    }

    // ---------- Helpers (public for tests) ----------

    public static string? HostOf(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) ? u.Host.ToLowerInvariant().Replace("www.", "") : null;

    /// <summary>Host plus full path, so product pages on one company site (adobe.com/products/photoshop) are not duplicates.</summary>
    public static string? DomainKey(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u)) return null;
        var host = u.Host.ToLowerInvariant().Replace("www.", "");
        var path = u.AbsolutePath.Trim('/').ToLowerInvariant();
        return path.Length > 0 ? $"{host}/{path}" : host;
    }

    /// <summary>example.co.uk → example.co.uk, docs.google.com → google.com (good enough for brand-family checks).</summary>
    public static string? RegistrableDomain(string? host)
    {
        if (host is null) return null;
        var parts = host.Split('.');
        if (parts.Length <= 2) return host;
        var take = parts[^2].Length <= 3 && parts[^1].Length <= 2 ? 3 : 2;
        return string.Join('.', parts[^take..]);
    }

    /// <summary>Pairs an editor confirmed are different products despite similar names.</summary>
    private static readonly HashSet<string> ConfirmedDistinct =
    [
        "claude|claude-code", "comet|comet-ml", "gemini-cli|gemini-code-assist", "rosebud|rosebud-ai",
    ];

    public static bool IsConfirmedDistinct(string a, string b) =>
        ConfirmedDistinct.Contains(string.CompareOrdinal(a, b) < 0 ? $"{a}|{b}" : $"{b}|{a}");

    public static string NormalizeName(string name) =>
        new string(name.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

    /// <summary>First word of the name, e.g. "Rosebud AI" and "Rosebud" share the stem "rosebud".</summary>
    public static string BrandStem(string name) =>
        NormalizeName(name.Split(' ', '.', '-', ':')[0]);

    public static bool BrandMatchesHost(string name, string slug, string host)
    {
        var flatHost = new string(host.Where(char.IsLetterOrDigit).ToArray());
        var tokens = name.ToLowerInvariant().Split(' ', '.', '-', ':', '(', ')', '/')
            .Select(t => new string(t.Where(char.IsLetterOrDigit).ToArray()))
            .Where(t => t.Length >= 3 && t is not ("app" or "the" or "for" or "and" or "pro"))
            .Append(slug.Replace("-", ""))
            .ToList();
        return tokens.Any(t => flatHost.Contains(t)) || flatHost.Contains(NormalizeName(name));
    }
}
