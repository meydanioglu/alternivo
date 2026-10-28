using Discovery.Application.Admin;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Domain;
using Discovery.Domain.Community;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Community;

/// <summary>
/// Rechecks, once a week per listing, that approved free listings still show the Alternivo badge. A missing badge
/// starts a grace period with an e-mail to the owner; after it the listing is unpublished, and it is published again
/// as soon as the badge is back. Only listings approved with a verified badge are checked; paid (Fast Review) listings and
/// free listings approved before the badge became required are not.
/// </summary>
public sealed class BadgeRecheckWorker(IServiceScopeFactory scopes, ILogger<BadgeRecheckWorker> logger) : BackgroundService
{
    private const int BatchSize = 25;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await RunBatchAsync(scope.ServiceProvider, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Badge recheck failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    public static async Task RunBatchAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var verifier = services.GetRequiredService<ShareProofVerifier>();
        var admin = services.GetRequiredService<AdminService>();
        var mail = services.GetRequiredService<EmailSender>();
        var site = (services.GetRequiredService<IConfiguration>()["Site:Url"] ?? "https://alternivo.com").TrimEnd('/');
        var log = services.GetRequiredService<ILogger<BadgeRecheckWorker>>();
        var now = DateTimeOffset.UtcNow;
        var due = now.AddDays(-ShareProof.BadgeRecheckDays);

        var batch = await db.Submissions
            .Where(s => s.Status == SubmissionStatus.Approved && !s.IsPriority && s.ShareProof == ShareProofKind.Badge && s.CreatedApplicationId != null
                && (s.BadgeCheckedAt == null || s.BadgeCheckedAt < due))
            .OrderBy(s => s.BadgeCheckedAt).Take(BatchSize).ToListAsync(ct);

        foreach (var s in batch)
        {
            bool found;
            string home;
            try
            {
                var page = await verifier.FetchHomeAsync(s.WebsiteUrl, ct);
                home = page.Home;
                found = ShareProof.BadgeLinked(page.Html);
            }
            catch (BadRequestException)
            {
                // An unusable website URL is a moderation matter, not a missing badge.
                s.BadgeCheckedAt = now;
                continue;
            }

            var appId = s.CreatedApplicationId!.Value;
            var action = ShareProof.Recheck(found, s.BadgeMissingSince, s.BadgeHiddenAt is not null, now);
            s.BadgeCheckedAt = now;
            var email = await db.Users.Where(u => u.Id == s.SubmittedByUserId).Select(u => u.Email).FirstOrDefaultAsync(ct);
            var link = $"{site}/maker";
            switch (action)
            {
                case BadgeRecheckAction.Clear:
                    s.BadgeMissingSince = null;
                    break;
                case BadgeRecheckAction.Warn:
                    s.BadgeMissingSince = now;
                    if (email is not null) await mail.SendAsync(email, EmailTemplate.BadgeMissing(site, s.Name, home, link));
                    break;
                case BadgeRecheckAction.Hide:
                    await admin.SetApplicationStatusAsync(Guid.Empty, appId, "unpublish", ct);
                    s.BadgeHiddenAt = now;
                    if (email is not null) await mail.SendAsync(email, EmailTemplate.BadgeHidden(site, s.Name, link));
                    break;
                case BadgeRecheckAction.Restore:
                    await admin.SetApplicationStatusAsync(Guid.Empty, appId, "publish", ct);
                    s.BadgeHiddenAt = null;
                    s.BadgeMissingSince = null;
                    break;
            }

            if (action != BadgeRecheckAction.None) log.LogInformation("Badge recheck {Action} for submission {Id} ({Home})", action, s.Id, home);
            await db.SaveChangesAsync(ct);
        }
    }
}
