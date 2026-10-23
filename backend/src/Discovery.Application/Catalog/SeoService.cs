using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Application.Ranking;
using Discovery.Domain.Community;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Discovery.Application.Catalog;

/// <summary>
/// Supplies canonical, indexable URLs for sitemaps and resolves managed redirects.
/// Only pages that pass the thin-content rules are listed.
/// </summary>
public sealed class SeoService(
    IAppDbContext db,
    CatalogService catalog,
    IOptions<RankingOptions> ranking)
{
    public const int SitemapPageSize = 10_000;
    public static readonly string[] SitemapTypes = ["software", "alternatives", "categories", "comparisons"];

    public async Task<IReadOnlyList<SitemapEntryDto>> GetSitemapAsync(string type, int page, CancellationToken ct)
    {
        var skip = (Math.Max(page, 1) - 1) * SitemapPageSize;
        var visible = catalog.Visible();

        switch (type)
        {
            case "software":
                return (await visible
                        .OrderBy(a => a.Slug)
                        .Skip(skip).Take(SitemapPageSize)
                        .Select(a => new { a.Slug, a.UpdatedAt })
                        .ToListAsync(ct))
                    .Select(a => new SitemapEntryDto($"/software/{a.Slug}", a.UpdatedAt))
                    .ToList();

            case "alternatives":
            {
                var min = ranking.Value.MinAlternativesForIndexing;
                var rows = await (
                        from r in db.AlternativeRelationships
                        where r.Status == ModerationStatus.Approved
                        join s in visible on r.SourceApplicationId equals s.Id
                        join a in visible on r.AlternativeApplicationId equals a.Id
                        group r by new { s.Slug, s.UpdatedAt } into g
                        where g.Count() >= min
                        orderby g.Key.Slug
                        select new { g.Key.Slug, g.Key.UpdatedAt, Latest = g.Max(x => x.UpdatedAt) })
                    .Skip(skip).Take(SitemapPageSize)
                    .ToListAsync(ct);
                return rows
                    .Select(r => new SitemapEntryDto($"/software/{r.Slug}/alternatives", r.Latest > r.UpdatedAt ? r.Latest : r.UpdatedAt))
                    .ToList();
            }

            case "categories":
            {
                var rows = await db.Categories
                    .Where(c => db.ApplicationCategories.Any(ac => ac.CategoryId == c.Id && visible.Any(a => a.Id == ac.ApplicationId))
                        || c.Children.Any(ch => db.ApplicationCategories.Any(ac => ac.CategoryId == ch.Id && visible.Any(a => a.Id == ac.ApplicationId))))
                    .OrderBy(c => c.Slug)
                    .Skip(skip).Take(SitemapPageSize)
                    .Select(c => new { c.Slug, c.UpdatedAt })
                    .ToListAsync(ct);
                return rows.Select(c => new SitemapEntryDto($"/category/{c.Slug}", c.UpdatedAt)).ToList();
            }

            case "comparisons":
            {
                if (page > 1)
                {
                    return [];
                }

                var rows = await (
                        from r in db.AlternativeRelationships
                        where r.Status == ModerationStatus.Approved
                        join s in visible on r.SourceApplicationId equals s.Id
                        join a in visible on r.AlternativeApplicationId equals a.Id
                        select new { S = s.Slug, A = a.Slug, SU = s.UpdatedAt, AU = a.UpdatedAt })
                    .ToListAsync(ct);
                return rows
                    .Select(x => new SitemapEntryDto(
                        $"/compare/{ComparisonSlug.Canonical([x.S, x.A])}",
                        x.SU > x.AU ? x.SU : x.AU))
                    .DistinctBy(e => e.Path)
                    .OrderBy(e => e.Path, StringComparer.Ordinal)
                    .Take(SitemapPageSize)
                    .ToList();
            }

            default:
                throw new NotFoundException("Sitemap", type);
        }
    }

    public async Task<RedirectDto?> FindRedirectAsync(string path, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Length > 500 || !path.StartsWith('/'))
        {
            return null;
        }

        var normalized = path.TrimEnd('/').ToLowerInvariant();
        var redirect = await db.SlugRedirects.AsNoTracking().FirstOrDefaultAsync(r => r.FromPath == normalized, ct);
        return redirect is null ? null : new RedirectDto(redirect.FromPath, redirect.ToPath, redirect.StatusCode);
    }
}
