using Discovery.Domain;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Community;

/// <summary>
/// Every 3 days, e-mails each maker with an open, unpaid, badge-less submission their real place in the free queue and
/// offers Fast Review. One e-mail per maker (about their oldest waiting product); each send is recorded in the audit log.
/// </summary>
public sealed class QueueReminderWorker(IServiceScopeFactory scopes, ILogger<QueueReminderWorker> logger) : BackgroundService
{
    public const string AuditAction = "submission.queue-reminder";
    public static readonly TimeSpan Interval = TimeSpan.FromDays(3);
    private static readonly SubmissionStatus[] Open = [SubmissionStatus.Pending, SubmissionStatus.InReview];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await RunAsync(scope.ServiceProvider, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Queue reminder run failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunAsync(IServiceProvider sp, CancellationToken ct)
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        // The free queue: open submissions with neither payment nor badge, oldest first.
        var queue = await db.Submissions
            .Where(s => Open.Contains(s.Status) && s.PriorityPaidAt == null && !s.IsPriority && s.ShareProof != ShareProofKind.Badge)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Name, s.SubmittedByUserId, s.CreatedAt })
            .ToListAsync(ct);
        if (queue.Count == 0) return;

        var recent = now - Interval;
        var skip = (await db.AuditLogs.Where(a => a.Action == AuditAction && a.CreatedAt > recent && a.EntityId != null)
            .Select(a => a.EntityId!.Value).ToListAsync(ct)).ToHashSet();
        // Wait a day after submitting before the first reminder.
        var targets = queue.Select((s, i) => (s, Position: i + 1))
            .Where(x => now - x.s.CreatedAt >= TimeSpan.FromDays(1))
            .GroupBy(x => x.s.SubmittedByUserId).Select(g => g.First())
            .Where(x => !skip.Contains(x.s.SubmittedByUserId)).ToList();
        if (targets.Count == 0) return;

        var userIds = targets.Select(x => x.s.SubmittedByUserId).ToList();
        var users = await db.Users.Where(u => userIds.Contains(u.Id) && u.Email != null)
            .Select(u => new { u.Id, u.Email, u.DisplayName }).ToDictionaryAsync(u => u.Id, ct);
        var site = sp.GetRequiredService<IConfiguration>()["Site:Url"] ?? "https://alternivo.com";
        var mail = sp.GetRequiredService<EmailSender>();
        var cents = PricingCatalog.ByKey("fastReview")?.PriceCents ?? 500;
        var price = cents % 100 == 0 ? $"${cents / 100}" : $"${cents / 100m:0.00}";
        var sent = 0;

        foreach (var (s, position) in targets)
        {
            if (!users.TryGetValue(s.SubmittedByUserId, out var u)) continue;
            var name = string.IsNullOrWhiteSpace(u.DisplayName) ? "there" : u.DisplayName!;
            try
            {
                await mail.SendAsync(u.Email!, EmailTemplate.QueueReminder(site, name, s.Name, position, queue.Count, price));
                db.AuditLogs.Add(new AuditLog
                {
                    UserId = null, Action = AuditAction, EntityType = "User", EntityId = u.Id,
                    DataJson = System.Text.Json.JsonSerializer.Serialize(new { submission = s.Id, position, waiting = queue.Count }), CreatedAt = now,
                });
                await db.SaveChangesAsync(ct);
                sent++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Queue reminder to {UserId} failed", u.Id);
            }

            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }

        logger.LogInformation("Queue reminders sent to {Count} maker(s)", sent);
    }
}
