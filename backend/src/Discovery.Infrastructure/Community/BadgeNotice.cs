using Discovery.Domain;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Community;

/// <summary>
/// One-off notice to makers whose free submissions are open but cannot be approved because the badge is not verified
/// (submitted before the badge became required). One e-mail per maker listing all such products; a submission is
/// noticed once, recorded in the audit log, so running it again only reaches new cases.
/// </summary>
public sealed class BadgeNotice(IServiceScopeFactory scopes, ILogger<BadgeNotice> logger)
{
    public const string AuditAction = "submission.badge-notice";
    private static readonly SubmissionStatus[] Open = [SubmissionStatus.Pending, SubmissionStatus.InReview, SubmissionStatus.NeedsChanges];

    private sealed record Recipient(Guid UserId, string Email, string Name, List<(Guid Id, string Product)> Submissions);

    private static async Task<List<Recipient>> RecipientsAsync(AppDbContext db, CancellationToken ct)
    {
        var noticed = db.AuditLogs.Where(a => a.Action == AuditAction).Select(a => a.EntityId);
        var rows = await db.Submissions
            .Where(s => Open.Contains(s.Status) && !s.IsPriority && s.ShareProof != ShareProofKind.Badge && !noticed.Contains(s.Id))
            .OrderBy(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Name, s.SubmittedByUserId })
            .ToListAsync(ct);
        var userIds = rows.Select(r => r.SubmittedByUserId).Distinct().ToList();
        var users = await db.Users.Where(u => userIds.Contains(u.Id) && u.Email != null)
            .Select(u => new { u.Id, u.Email, u.DisplayName }).ToDictionaryAsync(u => u.Id, ct);
        return rows.Where(r => users.ContainsKey(r.SubmittedByUserId))
            .GroupBy(r => r.SubmittedByUserId)
            .Select(g => new Recipient(g.Key, users[g.Key].Email!,
                string.IsNullOrWhiteSpace(users[g.Key].DisplayName) ? "there" : users[g.Key].DisplayName!,
                g.Select(r => (r.Id, r.Name)).ToList()))
            .ToList();
    }

    /// <summary>Starts sending in the background (spaced out for the SMTP provider) and returns how many makers will be e-mailed.</summary>
    public async Task<int> StartAsync(Guid actorId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var recipients = await RecipientsAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), ct);
        if (recipients.Count == 0) return 0;
        _ = Task.Run(() => SendAllAsync(actorId, recipients));
        return recipients.Count;
    }

    private async Task SendAllAsync(Guid actorId, List<Recipient> recipients)
    {
        foreach (var r in recipients)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var sp = scope.ServiceProvider;
                var site = sp.GetRequiredService<IConfiguration>()["Site:Url"] ?? "https://alternivo.com";
                await sp.GetRequiredService<EmailSender>().SendAsync(r.Email, EmailTemplate.BadgeRequired(site, r.Name, r.Submissions.Select(s => s.Product).ToList()));
                var db = sp.GetRequiredService<AppDbContext>();
                foreach (var (id, product) in r.Submissions)
                {
                    db.AuditLogs.Add(new AuditLog
                    {
                        UserId = actorId, Action = AuditAction, EntityType = "Submission", EntityId = id,
                        DataJson = System.Text.Json.JsonSerializer.Serialize(new { to = r.Email, product }), CreatedAt = DateTimeOffset.UtcNow,
                    });
                }

                await db.SaveChangesAsync();
                logger.LogInformation("Badge notice sent to {Email} for {Count} submission(s)", r.Email, r.Submissions.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Badge notice to {Email} failed", r.Email);
            }

            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
}
