using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Importing;

/// <summary>
/// Background queue runner for product imports. Claims queued items a few at a time, processes them in
/// parallel and records the outcome. Items left "running" by a crash are re-queued on startup.
/// </summary>
public sealed class ImportWorker(IServiceScopeFactory scopes, ILogger<ImportWorker> logger) : BackgroundService
{
    private const int Parallelism = 6;
    private const int MaxAttempts = 3;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        await ResetStuckAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var batch = await ClaimAsync(Parallelism, stoppingToken);
                if (batch.Count == 0)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    continue;
                }

                await Parallel.ForEachAsync(batch, new ParallelOptions { MaxDegreeOfParallelism = Parallelism, CancellationToken = stoppingToken },
                    async (id, ct) => await RunOneAsync(id, ct));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Import worker loop failed");
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
        }
    }

    private async Task ResetStuckAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.ImportItems.Where(i => i.Status == ImportStatus.Running)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.Status, ImportStatus.Queued), ct);
    }

    private async Task<List<Guid>> ClaimAsync(int count, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var items = await db.ImportItems.Where(i => i.Status == ImportStatus.Queued)
            .OrderBy(i => i.CreatedAt).Take(count).ToListAsync(ct);
        foreach (var item in items)
        {
            item.Status = ImportStatus.Running;
            item.Attempts++;
            item.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return items.Select(i => i.Id).ToList();
    }

    private async Task RunOneAsync(Guid id, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<ProductImporter>();
        var item = await db.ImportItems.FirstAsync(i => i.Id == id, ct);
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(90));
            await importer.ProcessAsync(item, timeout.Token);
            item.Status = ImportStatus.Done;
            item.LastSyncedAt = DateTimeOffset.UtcNow;
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Import of {Url} failed", item.Url);
            db.ChangeTracker.Clear();
            item = await db.ImportItems.FirstAsync(i => i.Id == id, ct);
            var message = ex is ImportException or Application.Common.AppException ? ex.Message : $"{ex.GetType().Name}: {ex.Message}";
            item.Error = message.Length > 1000 ? message[..1000] : message;
            item.Status = item.Attempts < MaxAttempts && ex is HttpRequestException or TaskCanceledException
                ? ImportStatus.Queued
                : ImportStatus.Failed;
        }

        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(CancellationToken.None);
    }
}
