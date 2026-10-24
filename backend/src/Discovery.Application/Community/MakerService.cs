using Discovery.Application.Abstractions;
using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Community;

public sealed record MakerSubmissionDto(
    Guid Id,
    string Name,
    string WebsiteUrl,
    string Status,
    string? ModeratorNote,
    bool IsPriority,
    string? ApplicationSlug,
    DateTimeOffset CreatedAt);

public sealed record MakerProductDto(ApplicationSummaryDto Application, DateTimeOffset? FeaturedUntil, bool LaunchBoosted, DateTimeOffset? PublishedAt);

public sealed record MakerEntitlementDto(
    Guid Id,
    string Kind,
    bool Active,
    DateTimeOffset? Expiration,
    bool Canceled,
    Guid? TargetId,
    string? TargetName,
    DateTimeOffset CreatedAt);

public sealed record MakerStatsDto(int Submitted, int Approved, int Pending, int Featured, int Launches);

public sealed record MakerDashboardDto(
    MakerStatsDto Stats,
    IReadOnlyList<MakerSubmissionDto> Submissions,
    IReadOnlyList<MakerProductDto> Products,
    IReadOnlyList<MakerEntitlementDto> Entitlements);

/// <summary>Maker area: a member's submissions, live products and paid boosts, and applying purchases to products.</summary>
public sealed class MakerService(IAppDbContext db, ICacheService cache, CatalogService catalog, TimeProvider clock)
{
    public async Task<MakerDashboardDto> DashboardAsync(Guid userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var submissions = await db.Submissions.Where(s => s.SubmittedByUserId == userId)
            .OrderByDescending(s => s.CreatedAt).Take(200).AsNoTracking().ToListAsync(ct);
        var appIds = submissions.Where(s => s.CreatedApplicationId != null).Select(s => s.CreatedApplicationId!.Value).ToList();
        var apps = await db.Applications.Where(a => appIds.Contains(a.Id) && a.DeletedAt == null)
            .Select(a => new { a.Id, a.Slug, a.Name, a.FeaturedUntil, a.LaunchBoosted, a.PublishedAt })
            .ToListAsync(ct);
        var summaries = await catalog.LoadSummariesAsync(apps.Select(a => a.Id).ToList(), ct);
        var slugById = apps.ToDictionary(a => a.Id, a => a.Slug);

        var entitlements = await db.BillingEntitlements.Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt).AsNoTracking().ToListAsync(ct);
        var targetIds = entitlements.Where(e => e.TargetId != null).Select(e => e.TargetId!.Value).ToList();
        var targetNames = await db.Applications.Where(a => targetIds.Contains(a.Id)).Select(a => new { a.Id, a.Name }).ToDictionaryAsync(a => a.Id, a => a.Name, ct);
        foreach (var s in submissions.Where(s => targetIds.Contains(s.Id))) targetNames[s.Id] = s.Name;

        var weekStart = LaunchService.WeekRange(now).Start;
        return new MakerDashboardDto(
            new MakerStatsDto(
                submissions.Count,
                submissions.Count(s => s.Status == SubmissionStatus.Approved),
                submissions.Count(s => s.Status is SubmissionStatus.Pending or SubmissionStatus.NeedsChanges),
                apps.Count(a => a.FeaturedUntil > now),
                apps.Count(a => a.PublishedAt >= weekStart.AddDays(-7 * 52))),
            submissions.Select(s => new MakerSubmissionDto(s.Id, s.Name, s.WebsiteUrl, s.Status.ToString(), s.ModeratorNote, s.IsPriority,
                s.CreatedApplicationId is { } aid ? slugById.GetValueOrDefault(aid) : null, s.CreatedAt)).ToList(),
            apps.Where(a => summaries.ContainsKey(a.Id))
                .Select(a => new MakerProductDto(summaries[a.Id], a.FeaturedUntil, a.LaunchBoosted, a.PublishedAt)).ToList(),
            entitlements.Select(e => new MakerEntitlementDto(e.Id, e.Kind.ToString(), e.IsActive(now), e.Expiration, e.IsCanceled,
                e.TargetId, e.TargetId is { } t ? targetNames.GetValueOrDefault(t) : null, e.CreatedAt)).ToList());
    }

    /// <summary>Applies a purchase to one of the member's own products (Featured, Launch boost) or pending submissions (Fast track).</summary>
    public async Task AssignAsync(Guid userId, Guid entitlementId, Guid targetId, CancellationToken ct)
    {
        var e = await db.BillingEntitlements.FirstOrDefaultAsync(x => x.Id == entitlementId && x.UserId == userId, ct)
            ?? throw new NotFoundException("Purchase", entitlementId.ToString());
        if (!e.IsActive(clock.GetUtcNow())) throw new ConflictException("This purchase is no longer active.");
        if (e.TargetId is not null && e.Kind != EntitlementKind.Featured)
            throw new ConflictException("This purchase has already been used.");

        switch (e.Kind)
        {
            case EntitlementKind.Featured:
            case EntitlementKind.LaunchBoost:
                var owns = await db.Submissions.AnyAsync(s => s.SubmittedByUserId == userId && s.CreatedApplicationId == targetId, ct);
                if (!owns) throw new ForbiddenException("You can only boost products you submitted.");
                break;
            case EntitlementKind.FastTrack:
                var pending = await db.Submissions.AnyAsync(s => s.Id == targetId && s.SubmittedByUserId == userId
                    && (s.Status == SubmissionStatus.Pending || s.Status == SubmissionStatus.NeedsChanges), ct);
                if (!pending) throw new BadRequestException("Fast track applies to one of your submissions that is waiting for review.");
                break;
            default:
                throw new BadRequestException("This purchase is not linked to a known plan yet. Contact support.");
        }

        var previous = e.TargetId;
        e.TargetId = targetId;
        e.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        if (previous is { } old && old != targetId) await RecomputeFeaturedAsync(old, ct);
        await ReapplyAsync(e.Id, ct);
    }

    /// <summary>Re-derives the effect of a purchase on its target after an assignment or a webhook update.</summary>
    public async Task ReapplyAsync(Guid entitlementId, CancellationToken ct)
    {
        var e = await db.BillingEntitlements.AsNoTracking().FirstOrDefaultAsync(x => x.Id == entitlementId, ct);
        if (e?.TargetId is not { } target) return;
        var now = clock.GetUtcNow();

        switch (e.Kind)
        {
            case EntitlementKind.Featured:
                await RecomputeFeaturedAsync(target, ct);
                break;
            case EntitlementKind.LaunchBoost when e.IsActive(now):
                var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == target, ct);
                if (app is not null)
                {
                    app.LaunchBoosted = true;
                    await db.SaveChangesAsync(ct);
                    await InvalidateAsync(app.Slug, ct);
                }

                break;
            case EntitlementKind.FastTrack when e.IsActive(now):
                var submission = await db.Submissions.FirstOrDefaultAsync(s => s.Id == target, ct);
                if (submission is not null)
                {
                    submission.IsPriority = true;
                    await db.SaveChangesAsync(ct);
                }

                break;
        }
    }

    /// <summary>Featured lasts as long as the longest active Featured purchase applied to the product.</summary>
    private async Task RecomputeFeaturedAsync(Guid appId, CancellationToken ct)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == appId, ct);
        if (app is null) return;
        var now = clock.GetUtcNow();
        var active = await db.BillingEntitlements
            .Where(x => x.TargetId == appId && x.Kind == EntitlementKind.Featured && !x.IsCanceled && (x.Expiration == null || x.Expiration > now))
            .Select(x => x.Expiration)
            .ToListAsync(ct);
        // A subscription without an expiration date stays featured until Freemius reports otherwise; renew monthly.
        app.FeaturedUntil = active.Count == 0 ? null : active.Max(x => x ?? now.AddDays(31));
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(app.Slug, ct);
    }

    private async Task InvalidateAsync(string slug, CancellationToken ct)
    {
        await cache.RemoveAsync(CacheKeys.Application(slug), ct);
        await cache.RemoveAsync(CacheKeys.Home, ct);
    }
}
