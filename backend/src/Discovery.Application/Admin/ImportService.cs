using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Domain;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

public sealed record QueueImportRequest(string Lines, string? CategorySlug);

public sealed record QueueImportResult(int Queued, int Duplicates, IReadOnlyList<string> Invalid);

public sealed record ImportRow(
    Guid Id,
    string Url,
    string? Name,
    string? CategorySlug,
    string Status,
    string? Error,
    int Attempts,
    Guid? ApplicationId,
    string? ApplicationSlug,
    string? ApplicationStatus,
    string? LogoUrl,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastSyncedAt);

public sealed record ImportOverview(IReadOnlyDictionary<string, int> Counts, PagedResult<ImportRow> Items);

/// <summary>Queue and track product imports. The work itself runs in the background import worker.</summary>
public sealed class ImportService(IAppDbContext db, TimeProvider clock)
{
    /// <summary>
    /// Each line: "url", "name | url" or "name | url | category-slug". Blank lines and #comments are ignored.
    /// URLs already queued or imported are skipped.
    /// </summary>
    public async Task<QueueImportResult> QueueAsync(Guid userId, QueueImportRequest request, CancellationToken ct)
    {
        var lines = (request.Lines ?? string.Empty).Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Where(l => !l.StartsWith('#')).Take(2000).ToList();

        var existingHosts = (await db.ImportItems.Select(i => i.Url).ToListAsync(ct))
            .Select(UrlSafety.ProductKey).OfType<string>().ToHashSet();
        var invalid = new List<string>();
        var duplicates = 0;
        var now = clock.GetUtcNow();
        var queued = 0;

        foreach (var line in lines)
        {
            var parts = line.Split('|', StringSplitOptions.TrimEntries);
            var urlIndex = Array.FindIndex(parts, p => p.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || p.StartsWith("https://", StringComparison.OrdinalIgnoreCase));
            if (urlIndex < 0 || !UrlSafety.IsSafePublicWebUrl(parts[urlIndex]))
            {
                invalid.Add(line.Length > 120 ? line[..120] : line);
                continue;
            }

            var url = parts[urlIndex];
            var key = UrlSafety.ProductKey(url);
            if (key is null || !existingHosts.Add(key))
            {
                duplicates++;
                continue;
            }

            var name = urlIndex > 0 ? parts[0] : null;
            var category = parts.Length > urlIndex + 1 && Slugs.IsValid(parts[urlIndex + 1]) ? parts[urlIndex + 1] : request.CategorySlug;
            db.ImportItems.Add(new ImportItem
            {
                Url = url,
                Name = string.IsNullOrWhiteSpace(name) ? null : name.Length > 100 ? name[..100] : name,
                CategorySlug = string.IsNullOrWhiteSpace(category) ? null : category,
                RequestedByUserId = userId,
                CreatedAt = now.AddTicks(queued),
                UpdatedAt = now,
            });
            queued++;
        }

        await db.SaveChangesAsync(ct);
        return new QueueImportResult(queued, duplicates, invalid);
    }

    public async Task<ImportOverview> ListAsync(string? status, int? page, CancellationToken ct)
    {
        var counts = await db.ImportItems.GroupBy(i => i.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        var countMap = Enum.GetValues<ImportStatus>().ToDictionary(s => s.ToString().ToLowerInvariant(), s => counts.FirstOrDefault(c => c.Key == s)?.Count ?? 0);

        var (p, size) = Paging.Normalize(page, 100);
        var query = db.ImportItems.AsQueryable();
        if (Enum.TryParse<ImportStatus>(status, true, out var s)) query = query.Where(i => i.Status == s);
        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(i => i.UpdatedAt)
            .Skip((p - 1) * size).Take(size)
            .Select(i => new
            {
                Item = i,
                App = db.Applications.Where(a => a.Id == i.ApplicationId).Select(a => new { a.Slug, a.Status, a.LogoUrl }).FirstOrDefault(),
            })
            .ToListAsync(ct);

        var items = rows.Select(r => new ImportRow(r.Item.Id, r.Item.Url, r.Item.Name, r.Item.CategorySlug, r.Item.Status.ToString(),
            r.Item.Error, r.Item.Attempts, r.Item.ApplicationId, r.App?.Slug, r.App?.Status.ToString(), r.App?.LogoUrl,
            r.Item.UpdatedAt, r.Item.LastSyncedAt)).ToList();
        return new ImportOverview(countMap, new PagedResult<ImportRow>(items, p, size, total));
    }

    /// <summary>Re-queues items. scope: "failed" (retry failures) or "all" (re-sync every finished import).</summary>
    public Task<int> RequeueAsync(string scope, CancellationToken ct)
    {
        var query = scope == "all"
            ? db.ImportItems.Where(i => i.Status == ImportStatus.Done || i.Status == ImportStatus.Failed)
            : db.ImportItems.Where(i => i.Status == ImportStatus.Failed);
        return query.ExecuteUpdateAsync(s => s
            .SetProperty(i => i.Status, ImportStatus.Queued)
            .SetProperty(i => i.Attempts, 0)
            .SetProperty(i => i.UpdatedAt, clock.GetUtcNow()), ct);
    }

    public async Task RequeueOneAsync(Guid id, CancellationToken ct)
    {
        var item = await db.ImportItems.FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("Import", id.ToString());
        item.Status = ImportStatus.Queued;
        item.Attempts = 0;
        item.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        await db.ImportItems.Where(i => i.Id == id && i.Status != ImportStatus.Running).ExecuteDeleteAsync(ct);
    }

    /// <summary>Publishes every draft application that came from a finished import.</summary>
    public async Task<IReadOnlyList<Guid>> DraftIdsAsync(CancellationToken ct) =>
        await db.ImportItems.Where(i => i.Status == ImportStatus.Done && i.ApplicationId != null)
            .Join(db.Applications.Where(a => a.Status == PublicationStatus.Draft && a.DeletedAt == null),
                i => i.ApplicationId, a => a.Id, (i, a) => a.Id)
            .Distinct().ToListAsync(ct);
}
