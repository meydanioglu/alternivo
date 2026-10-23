using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Discovery.Application.Catalog;

public sealed class SearchService(
    IAppDbContext db,
    ISearchProvider provider,
    CatalogService catalog,
    ILogger<SearchService> logger)
{
    public const int MaxQueryLength = 100;

    public static string? Normalize(string? q)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return null;
        }

        var trimmed = string.Join(' ', q.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return trimmed.Length > MaxQueryLength ? trimmed[..MaxQueryLength] : trimmed;
    }

    public async Task<SearchResultDto> SearchAsync(string? q, int? page, int? pageSize, CancellationToken ct)
    {
        var query = Normalize(q) ?? throw new BadRequestException("Search query is required.");
        var (p, size) = Paging.Normalize(page, pageSize);

        var (ids, total) = await provider.SearchApplicationsAsync(query, (p - 1) * size, size, ct);
        var summaries = await catalog.LoadSummariesAsync(ids, ct);
        var categoryIds = p == 1 ? await provider.SearchCategoriesAsync(query, 5, ct) : [];
        var categories = categoryIds.Count == 0
            ? []
            : (await db.Categories.Where(c => categoryIds.Contains(c.Id)).AsNoTracking().ToListAsync(ct))
                .OrderBy(c => categoryIds.ToList().IndexOf(c.Id))
                .Select(c => new CategoryRef(c.Slug, c.Name))
                .ToList();

        if (p == 1)
        {
            await LogQueryAsync(query, total, ct);
        }

        return new SearchResultDto(
            query,
            new PagedResult<ApplicationSummaryDto>(ids.Where(summaries.ContainsKey).Select(id => summaries[id]).ToList(), p, size, total),
            categories);
    }

    public async Task<IReadOnlyList<SuggestionDto>> SuggestAsync(string? q, CancellationToken ct)
    {
        var query = Normalize(q);
        if (query is null)
        {
            return [];
        }

        var (ids, _) = await provider.SearchApplicationsAsync(query, 0, 6, ct);
        var summaries = await catalog.LoadSummariesAsync(ids, ct);
        var categoryIds = await provider.SearchCategoriesAsync(query, 3, ct);
        var categories = categoryIds.Count == 0
            ? []
            : await db.Categories.Where(c => categoryIds.Contains(c.Id)).AsNoTracking().ToListAsync(ct);

        var results = ids
            .Where(summaries.ContainsKey)
            .Select(id => summaries[id])
            .Select(s => new SuggestionDto("application", s.Slug, s.Name, s.PrimaryCategory?.Name, s.LogoUrl))
            .ToList();
        results.AddRange(categoryIds
            .Select(id => categories.FirstOrDefault(c => c.Id == id))
            .Where(c => c is not null)
            .Select(c => new SuggestionDto("category", c!.Slug, c.Name, "Category", null)));
        return results;
    }

    private async Task LogQueryAsync(string query, int resultCount, CancellationToken ct)
    {
        try
        {
            db.SearchQueryLogs.Add(new SearchQueryLog { Query = query.ToLowerInvariant(), ResultCount = resultCount });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Analytics must never break search.
            logger.LogWarning(ex, "Failed to record search analytics");
        }
    }
}
