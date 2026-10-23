using Discovery.Application.Abstractions;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Community;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Discovery.Application.Catalog;

/// <summary>Builds the homepage. Every number here comes from a real query; empty sections stay empty.</summary>
public sealed class HomeService(
    IAppDbContext db,
    ICacheService cache,
    CatalogService catalog,
    TaxonomyService taxonomy,
    IUserDirectory users,
    IOptions<CatalogOptions> options,
    TimeProvider clock)
{
    private static readonly string[] AiCategorySlugs = ["ai-assistants", "ai-coding-tools", "ai-tools"];
    private readonly CatalogOptions _options = options.Value;

    public Task<HomeDto> GetAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync(CacheKeys.Home, TimeSpan.FromSeconds(_options.HomeCacheSeconds), BuildAsync, ct);

    private async Task<HomeDto> BuildAsync(CancellationToken ct)
    {
        var visible = catalog.Visible();
        var stats = new HomeStatsDto(
            await visible.CountAsync(ct),
            await db.Categories.CountAsync(c => c.Applications.Any(), ct),
            await db.AlternativeRelationships.CountAsync(r => r.Status == ModerationStatus.Approved, ct),
            await db.Reviews.CountAsync(r => r.Status == ReviewStatus.Published, ct));

        var since = clock.GetUtcNow().AddDays(-30);
        var minCount = _options.PopularSearchMinCount;
        var popularSearches = await db.SearchQueryLogs
            .Where(s => s.CreatedAt >= since && s.ResultCount > 0)
            .GroupBy(s => s.Query.ToLower())
            .Select(g => new { Query = g.Key, Count = g.Count() })
            .Where(x => x.Count >= minCount)
            .OrderByDescending(x => x.Count)
            .Take(8)
            .ToListAsync(ct);

        var trending = await catalog.TopAsync(q => q.OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore), 8, ct);
        var recentlyAdded = await catalog.TopAsync(q => q.OrderByDescending(a => a.PublishedAt), 8, ct);
        var newlyReleased = await catalog.TopAsync(
            q => q.Where(a => a.ReleasedOn != null).OrderByDescending(a => a.ReleasedOn), 6, ct);
        var openSource = await catalog.TopAsync(
            q => q.Where(a => a.License != null && a.License.IsOpenSource)
                .OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore), 8, ct);
        var free = await catalog.TopAsync(
            q => q.Where(a => ((int)a.Pricing & (int)PricingModel.Free) != 0)
                .OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore), 8, ct);
        var aiTools = await catalog.TopAsync(
            q => q.Where(a => a.Categories.Any(c => AiCategorySlugs.Contains(c.Category!.Slug)
                    || (c.Category.Parent != null && AiCategorySlugs.Contains(c.Category.Parent.Slug))))
                .OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore), 8, ct);
        // Community favourites only exist once real users have liked something.
        var favourites = await catalog.TopAsync(
            q => q.Where(a => a.LikeCount > 0).OrderByDescending(a => a.LikeCount), 8, ct);

        var tree = await taxonomy.GetCategoryTreeAsync(ct);
        var featuredCategories = tree
            .Concat(tree.SelectMany(t => t.Children))
            .Where(c => c.IsFeatured && c.ApplicationCount > 0)
            .Take(12)
            .ToList();

        var comparisons = await catalog.PopularComparisonsAsync(null, 8, ct);

        var reviews = await db.Reviews
            .Where(r => r.Status == ReviewStatus.Published)
            .OrderByDescending(r => r.CreatedAt)
            .Take(6)
            .Select(r => new { Review = r, AppSlug = r.Application!.Slug, AppName = r.Application.Name })
            .AsNoTracking()
            .ToListAsync(ct);
        var names = await users.GetDisplayNamesAsync(reviews.Select(r => r.Review.UserId), ct);

        return new HomeDto(
            stats,
            popularSearches.Select(p => new PopularSearchDto(p.Query, p.Count)).ToList(),
            trending,
            recentlyAdded,
            newlyReleased,
            featuredCategories,
            openSource,
            free,
            aiTools,
            favourites,
            comparisons,
            reviews.Select(r => r.Review.ToDto(
                names.GetValueOrDefault(r.Review.UserId, "Community member"),
                new NamedRef(r.AppSlug, r.AppName))).ToList());
    }
}
