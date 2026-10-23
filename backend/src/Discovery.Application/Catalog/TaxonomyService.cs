using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Discovery.Application.Catalog;

public sealed class TaxonomyService(
    IAppDbContext db,
    ICacheService cache,
    CatalogService catalog,
    IOptions<CatalogOptions> options)
{
    private readonly CatalogOptions _options = options.Value;

    public Task<IReadOnlyList<CategoryDto>> GetCategoryTreeAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync(
            CacheKeys.Categories,
            TimeSpan.FromSeconds(_options.TaxonomyCacheSeconds),
            BuildCategoryTreeAsync,
            ct);

    private async Task<IReadOnlyList<CategoryDto>> BuildCategoryTreeAsync(CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().ToListAsync(ct);
        var counts = await CountsAsync(categories, ct);

        CategoryDto Map(Category c) => new(
            c.Slug,
            c.Name,
            c.Description,
            c.Icon,
            counts.GetValueOrDefault(c.Id),
            c.IsFeatured,
            categories.Where(x => x.ParentId == c.Id).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).Select(Map).ToList());

        return categories
            .Where(c => c.ParentId is null)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(Map)
            .ToList();
    }

    /// <summary>Distinct visible-application counts per category, including direct subcategories.</summary>
    private async Task<Dictionary<Guid, int>> CountsAsync(IReadOnlyList<Category> categories, CancellationToken ct)
    {
        var pairs = await db.ApplicationCategories
            .Join(catalog.Visible(), ac => ac.ApplicationId, a => a.Id, (ac, a) => new { ac.CategoryId, ac.ApplicationId })
            .AsNoTracking()
            .ToListAsync(ct);

        var appsByCategory = pairs
            .GroupBy(p => p.CategoryId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.ApplicationId).ToHashSet());

        return categories.ToDictionary(c => c.Id, c =>
        {
            var set = new HashSet<Guid>(appsByCategory.GetValueOrDefault(c.Id) ?? []);
            foreach (var child in categories.Where(x => x.ParentId == c.Id))
            {
                set.UnionWith(appsByCategory.GetValueOrDefault(child.Id) ?? []);
            }

            return set.Count;
        });
    }

    public async Task<CategoryDetailDto> GetCategoryAsync(string slug, CancellationToken ct)
    {
        if (!Slugs.IsValid(slug))
        {
            throw new NotFoundException("Category", slug);
        }

        var category = await db.Categories
            .Include(c => c.Parent)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug, ct)
            ?? throw new NotFoundException("Category", slug);

        var tree = await GetCategoryTreeAsync(ct);
        var flat = tree.Concat(tree.SelectMany(t => t.Children)).ToList();
        var self = flat.FirstOrDefault(c => c.Slug == slug);
        var children = self?.Children ?? [];

        var featured = await catalog.TopAsync(
            q => q.Where(a => a.Categories.Any(c => c.CategoryId == category.Id
                    || (c.Category!.ParentId != null && c.Category.ParentId == category.Id)))
                .OrderByDescending(a => a.EditorialScore).ThenByDescending(a => a.LikeCount),
            4,
            ct);

        var comparisons = await catalog.PopularComparisonsAsync(category.Id, 6, ct);

        // Related: siblings under the same parent, or other featured top-level categories.
        var siblings = category.Parent is { } parent
            ? tree.FirstOrDefault(t => t.Slug == parent.Slug)?.Children ?? []
            : tree.Where(c => c.IsFeatured).ToList();
        var related = siblings
            .Where(c => c.Slug != slug)
            .Where(c => c.ApplicationCount > 0)
            .Take(8)
            .Select(c => new CategoryRef(c.Slug, c.Name))
            .ToList();

        return new CategoryDetailDto(
            category.Slug,
            category.Name,
            category.Description,
            category.SeoIntro,
            category.Icon,
            self?.ApplicationCount ?? 0,
            category.Parent is null ? null : new CategoryRef(category.Parent.Slug, category.Parent.Name),
            children,
            featured,
            comparisons,
            related);
    }

    public Task<IReadOnlyList<PlatformRef>> GetPlatformsAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync<IReadOnlyList<PlatformRef>>(
            CacheKeys.Platforms,
            TimeSpan.FromSeconds(_options.TaxonomyCacheSeconds),
            async token => (await db.Platforms.AsNoTracking().OrderBy(p => p.SortOrder).ToListAsync(token))
                .Select(p => p.ToRef())
                .ToList(),
            ct);
}
