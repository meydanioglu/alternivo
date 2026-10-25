using Discovery.Application.Admin;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Seo;

/// <summary>Stores one internal SEO snapshot per day (checks hourly; the snapshot itself is idempotent).</summary>
public sealed class SeoSnapshotWorker(IServiceScopeFactory scopes, ILogger<SeoSnapshotWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                if (await scope.ServiceProvider.GetRequiredService<QualityService>().SnapshotAsync(stoppingToken))
                {
                    logger.LogInformation("SEO snapshot stored");
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "SEO snapshot failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
