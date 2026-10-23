using Discovery.Domain.Operations;
using Discovery.Infrastructure.Importing;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Content;

/// <summary>Background runner for content drafts. Idles while no OpenAI key is configured.</summary>
public sealed class ContentWorker(IServiceScopeFactory scopes, ILogger<ContentWorker> logger) : BackgroundService
{
    private const int Parallelism = 3;
    private const int MaxAttempts = 3;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        using (var scope = scopes.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().ContentDrafts
                .Where(d => d.Status == ContentDraftStatus.Generating)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.Status, ContentDraftStatus.Queued), stoppingToken);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var batch = await ClaimAsync(stoppingToken);
                if (batch.Count == 0)
                {
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
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
                logger.LogError(ex, "Content worker loop failed");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }

    private async Task<List<Guid>> ClaimAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        if (!await scope.ServiceProvider.GetRequiredService<ContentGenerator>().IsConfiguredAsync(ct)) return [];
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var drafts = await db.ContentDrafts.Where(d => d.Status == ContentDraftStatus.Queued)
            .OrderBy(d => d.CreatedAt).Take(Parallelism).ToListAsync(ct);
        foreach (var d in drafts)
        {
            d.Status = ContentDraftStatus.Generating;
            d.Attempts++;
            d.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return drafts.Select(d => d.Id).ToList();
    }

    private async Task RunOneAsync(Guid id, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var generator = scope.ServiceProvider.GetRequiredService<ContentGenerator>();
        var draft = await db.ContentDrafts.FirstAsync(d => d.Id == id, ct);
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromMinutes(4));
            await generator.GenerateAsync(draft, timeout.Token);
            draft.Status = ContentDraftStatus.Ready;
            draft.Error = draft.SourceChars == 0 ? "No website text available (blocked or empty); content is general — check carefully." : null;
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Content generation failed for draft {Id}", id);
            db.ChangeTracker.Clear();
            draft = await db.ContentDrafts.FirstAsync(d => d.Id == id, ct);
            var transient = ex is HttpRequestException or TaskCanceledException;
            draft.Error = (ex is ImportException or HttpRequestException ? ex.Message : $"{ex.GetType().Name}: {ex.Message}") is var m && m.Length > 1000 ? m[..1000] : m;
            draft.Status = transient && draft.Attempts < MaxAttempts ? ContentDraftStatus.Queued : ContentDraftStatus.Failed;
            if (transient) await Task.Delay(TimeSpan.FromSeconds(20), ct);
        }

        draft.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(CancellationToken.None);
    }
}
