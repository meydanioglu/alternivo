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
    DateTimeOffset CreatedAt,
    /// <summary>standard | fast</summary>
    string ReviewMethod,
    /// <summary>none | awaiting | paid</summary>
    string PaymentStatus,
    DateTimeOffset? ReviewDeadline,
    bool CanUpgrade);

public sealed record MakerProductDto(
    ApplicationSummaryDto Application,
    DateTimeOffset? FeaturedUntil,
    bool LaunchBoosted,
    DateTimeOffset? PublishedAt,
    DateTimeOffset? GrowthUntil = null);

public sealed record MakerEntitlementDto(
    Guid Id,
    string Kind,
    bool Active,
    DateTimeOffset? Expiration,
    bool Canceled,
    Guid? TargetId,
    string? TargetName,
    DateTimeOffset CreatedAt,
    string? PlanName = null,
    int? PriceCents = null,
    bool Recurring = false);

public sealed record MakerCampaignDto(
    Guid Id,
    string PlanKey,
    string PlanName,
    string ApplicationName,
    string? TargetName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    /// <summary>awaiting-payment | reservation-expired | pending-approval | scheduled | live | ended | rejected | canceled</summary>
    string State,
    int PriceCents,
    string? ModeratorNote,
    DateTimeOffset CreatedAt);

public sealed record MakerStatsDto(int Submitted, int Approved, int Pending, int Featured, int Launches, int ActiveCampaigns = 0, int ActiveSubscriptions = 0);

public sealed record MakerDashboardDto(
    MakerStatsDto Stats,
    IReadOnlyList<MakerSubmissionDto> Submissions,
    IReadOnlyList<MakerProductDto> Products,
    IReadOnlyList<MakerEntitlementDto> Entitlements,
    IReadOnlyList<MakerCampaignDto>? Campaigns = null,
    bool FoundingVendor = false);

public sealed record AdminCampaignRow(
    Guid Id, string PlanName, Guid UserId, string ApplicationName, string ApplicationSlug, string? TargetName,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt, string State, int PriceCents, DateTimeOffset? PaidAt, string? ModeratorNote, DateTimeOffset CreatedAt);

public sealed record CreateCampaignRequest(Guid ApplicationId, string PlanKey, string? TargetSlug, DateTimeOffset? StartsAt);

public sealed record AvailabilityDto(string PlanKey, int Limit, int Taken, bool Available, DateTimeOffset StartsAt, DateTimeOffset EndsAt, DateTimeOffset? NextAvailableAt);

public sealed record CheckoutTicket(PlanDefinition Plan, Guid IntentId);

public sealed record PlanDto(string Key, string Name, int PriceCents, bool Recurring, int? DurationDays, int? InventoryLimit);

public sealed record PricingDto(IReadOnlyList<PlanDto> Plans, int FoundingLimit, int FoundingTaken, int FreeReviewDays, int FastReviewHours);

/// <summary>
/// Vendor (maker) area: submissions and their review speed, owned products, paid subscriptions and sponsorship campaigns.
/// All pricing and inventory decisions happen here, server-side; the payment webhook only reports what was paid for.
/// </summary>
public sealed class MakerService(IAppDbContext db, ICacheService cache, CatalogService catalog, TimeProvider clock)
{
    private static readonly SubmissionStatus[] Reviewable = [SubmissionStatus.Pending, SubmissionStatus.NeedsChanges, SubmissionStatus.InReview];

    /// <summary>Products a member may promote: the published listings created from their approved submissions.</summary>
    private IQueryable<Guid> OwnedApplicationIds(Guid userId) =>
        db.Submissions.Where(s => s.SubmittedByUserId == userId && s.Status == SubmissionStatus.Approved && s.CreatedApplicationId != null)
            .Select(s => s.CreatedApplicationId!.Value);

    public async Task<PricingDto> PricingAsync(CancellationToken ct) => new(
        PricingCatalog.Plans.Select(p => new PlanDto(p.Key, p.Name, p.PriceCents, p.Recurring, p.DurationDays, p.InventoryLimit)).ToList(),
        PricingCatalog.FoundingVendorLimit,
        await db.FoundingVendors.CountAsync(ct),
        PricingCatalog.FreeReviewDays,
        PricingCatalog.FastReviewHours);

    public async Task<MakerDashboardDto> DashboardAsync(Guid userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var submissions = await db.Submissions.Where(s => s.SubmittedByUserId == userId)
            .OrderByDescending(s => s.CreatedAt).Take(200).AsNoTracking().ToListAsync(ct);
        var appIds = submissions.Where(s => s.CreatedApplicationId != null).Select(s => s.CreatedApplicationId!.Value).ToList();
        var apps = await db.Applications.Where(a => appIds.Contains(a.Id) && a.DeletedAt == null)
            .Select(a => new { a.Id, a.Slug, a.Name, a.FeaturedUntil, a.LaunchBoosted, a.PublishedAt, a.GrowthUntil })
            .ToListAsync(ct);
        var summaries = await catalog.LoadSummariesAsync(apps.Select(a => a.Id).ToList(), ct);
        var slugById = apps.ToDictionary(a => a.Id, a => a.Slug);

        var entitlements = await db.BillingEntitlements.Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt).AsNoTracking().ToListAsync(ct);
        var campaigns = await db.SponsorshipCampaigns.Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt).Take(100).AsNoTracking().ToListAsync(ct);
        var openIntents = await db.CheckoutIntents
            .Where(i => i.UserId == userId && i.Kind == EntitlementKind.FastTrack && i.ConsumedAt == null && i.CreatedAt > now.AddHours(-2))
            .Select(i => i.TargetId).ToListAsync(ct);

        var nameIds = entitlements.Where(e => e.TargetId != null).Select(e => e.TargetId!.Value)
            .Concat(campaigns.Select(c => c.ApplicationId))
            .Concat(campaigns.Where(c => c.TargetApplicationId != null).Select(c => c.TargetApplicationId!.Value)).Distinct().ToList();
        var names = await db.Applications.Where(a => nameIds.Contains(a.Id)).Select(a => new { a.Id, a.Name }).ToDictionaryAsync(a => a.Id, a => a.Name, ct);
        foreach (var s in submissions.Where(s => nameIds.Contains(s.Id))) names[s.Id] = s.Name;
        var catIds = campaigns.Where(c => c.TargetCategoryId != null).Select(c => c.TargetCategoryId!.Value).Distinct().ToList();
        var catNames = await db.Categories.Where(c => catIds.Contains(c.Id)).Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        foreach (var c in campaigns.Where(c => c.EntitlementId != null)) names[c.Id] = names.GetValueOrDefault(c.ApplicationId, "Campaign");

        var weekStart = LaunchService.WeekRange(now).Start;
        return new MakerDashboardDto(
            new MakerStatsDto(
                submissions.Count,
                submissions.Count(s => s.Status == SubmissionStatus.Approved),
                submissions.Count(s => Reviewable.Contains(s.Status)),
                apps.Count(a => a.FeaturedUntil > now),
                apps.Count(a => a.PublishedAt >= weekStart.AddDays(-7 * 52)),
                campaigns.Count(c => c.IsLive(now)),
                entitlements.Count(e => e.IsActive(now) && e.Kind is EntitlementKind.Featured or EntitlementKind.Growth)),
            submissions.Select(s => new MakerSubmissionDto(s.Id, s.Name, s.WebsiteUrl, s.Status.ToString(), s.ModeratorNote, s.IsPriority,
                s.CreatedApplicationId is { } aid ? slugById.GetValueOrDefault(aid) : null, s.CreatedAt,
                s.IsPriority ? "fast" : "standard",
                s.IsPriority ? "paid" : openIntents.Contains(s.Id) ? "awaiting" : "none",
                s.ReviewDeadline ?? s.CreatedAt.AddDays(PricingCatalog.FreeReviewDays),
                !s.IsPriority && Reviewable.Contains(s.Status))).ToList(),
            apps.Where(a => summaries.ContainsKey(a.Id))
                .Select(a => new MakerProductDto(summaries[a.Id], a.FeaturedUntil, a.LaunchBoosted, a.PublishedAt, a.GrowthUntil)).ToList(),
            entitlements.Select(e =>
            {
                var plan = PricingCatalog.ByKind(e.Kind);
                return new MakerEntitlementDto(e.Id, e.Kind.ToString(), e.IsActive(now), e.Expiration, e.IsCanceled,
                    e.TargetId, e.TargetId is { } t ? names.GetValueOrDefault(t) : null, e.CreatedAt, plan?.Name, plan?.PriceCents, plan?.Recurring ?? false);
            }).ToList(),
            campaigns.Select(c =>
            {
                var plan = PricingCatalog.ByPlacement(c.Placement)!;
                var target = c.TargetCategoryId is { } cat ? catNames.GetValueOrDefault(cat)
                    : c.TargetApplicationId is { } ta ? names.GetValueOrDefault(ta) : "Homepage";
                return new MakerCampaignDto(c.Id, plan.Key, plan.Name, names.GetValueOrDefault(c.ApplicationId, "?"), target,
                    c.StartsAt, c.EndsAt, CampaignState(c, now), c.PriceCents, c.ModeratorNote, c.CreatedAt);
            }).ToList(),
            await db.FoundingVendors.AnyAsync(f => f.UserId == userId, ct));
    }

    public static string CampaignState(SponsorshipCampaign c, DateTimeOffset now) => c.Status switch
    {
        CampaignStatus.AwaitingPayment => c.HoldsInventory(now) ? "awaiting-payment" : "reservation-expired",
        CampaignStatus.PendingApproval => "pending-approval",
        CampaignStatus.Approved => c.EndsAt <= now ? "ended" : c.StartsAt > now ? "scheduled" : "live",
        CampaignStatus.Rejected => "rejected",
        _ => "canceled",
    };

    // ---------- Campaigns and inventory ----------

    private async Task<(PlanDefinition Plan, string Key, Guid? CategoryId, Guid? TargetAppId)> ResolveTargetAsync(
        string planKey, string? targetSlug, Guid? ownApplicationId, CancellationToken ct)
    {
        var plan = PricingCatalog.ByKey(planKey);
        if (plan?.Placement is not { } placement || placement == SponsorPlacement.Subscription)
            throw new BadRequestException("Choose a sponsorship placement.");

        switch (placement)
        {
            case SponsorPlacement.HomepageSpotlight:
                return (plan, "home", null, null);
            case SponsorPlacement.Category:
            {
                var category = await db.Categories.Where(c => c.Slug == targetSlug).Select(c => new { c.Id }).FirstOrDefaultAsync(ct)
                    ?? throw new BadRequestException("Choose a category to sponsor.");
                return (plan, $"cat:{category.Id}", category.Id, null);
            }

            default:
            {
                var target = await catalog.Visible().Where(a => a.Slug == targetSlug).Select(a => new { a.Id }).FirstOrDefaultAsync(ct)
                    ?? throw new BadRequestException("Choose a competitor product to target.");
                if (target.Id == ownApplicationId) throw new BadRequestException("Choose a competitor, not your own product.");
                return (plan, $"{(placement == SponsorPlacement.Competitor ? "cmp" : "alt")}:{target.Id}", null, target.Id);
            }
        }
    }

    private static (DateTimeOffset Start, DateTimeOffset End) Window(PlanDefinition plan, DateTimeOffset? requested, DateTimeOffset now)
    {
        var start = requested is { } r && r > now ? new DateTimeOffset(r.UtcDateTime.Date, TimeSpan.Zero) : now;
        if (start < now) start = now;
        if (start > now.AddDays(90)) throw new BadRequestException("Campaigns can be scheduled up to 90 days ahead.");
        return (start, start.AddDays(plan.DurationDays!.Value));
    }

    private async Task<List<(DateTimeOffset Start, DateTimeOffset End)>> TakenAsync(string key, DateTimeOffset now, Guid? except, CancellationToken ct)
    {
        var holdFrom = now - PricingCatalog.ReservationHold;
        var rows = await db.SponsorshipCampaigns
            .Where(c => c.InventoryKey == key && c.Id != except && c.EndsAt > now
                && (c.Status == CampaignStatus.PendingApproval || c.Status == CampaignStatus.Approved
                    || (c.Status == CampaignStatus.AwaitingPayment && c.CreatedAt > holdFrom)))
            .Select(c => new { c.StartsAt, c.EndsAt }).ToListAsync(ct);
        return rows.Select(r => (r.StartsAt, r.EndsAt)).ToList();
    }

    public async Task<AvailabilityDto> AvailabilityAsync(string planKey, string? targetSlug, DateTimeOffset? startsAt, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var (plan, key, _, _) = await ResolveTargetAsync(planKey, targetSlug, null, ct);
        var (start, end) = Window(plan, startsAt, now);
        var taken = await TakenAsync(key, now, null, ct);
        var count = PricingCatalog.Overlapping(taken, start, end);
        DateTimeOffset? next = null;
        if (count >= plan.InventoryLimit)
        {
            // Earliest end of an overlapping reservation is the first moment a slot can free up.
            next = taken.Where(t => t.Start < end && start < t.End).Min(t => t.End);
        }

        return new AvailabilityDto(plan.Key, plan.InventoryLimit!.Value, count, count < plan.InventoryLimit, start, end, next);
    }

    /// <summary>
    /// Reserves a slot for 30 minutes while the vendor pays. A Postgres advisory lock per inventory key serialises
    /// concurrent reservations, so two sponsors can never both take the last slot.
    /// </summary>
    public async Task<Guid> CreateCampaignAsync(Guid userId, CreateCampaignRequest r, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        if (!await OwnedApplicationIds(userId).ContainsAsync(r.ApplicationId, ct))
            throw new ForbiddenException("You can only promote products you own.");
        var (plan, key, categoryId, targetAppId) = await ResolveTargetAsync(r.PlanKey, r.TargetSlug, r.ApplicationId, ct);
        var (start, end) = Window(plan, r.StartsAt, now);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockAsync(key, ct);
        var open = await db.SponsorshipCampaigns.CountAsync(c => c.UserId == userId && c.Status == CampaignStatus.AwaitingPayment
            && c.CreatedAt > now - PricingCatalog.ReservationHold, ct);
        if (open >= 3) throw new ConflictException("Finish or let your open reservations expire before reserving more.");
        if (PricingCatalog.Overlapping(await TakenAsync(key, now, null, ct), start, end) >= plan.InventoryLimit)
            throw new ConflictException("This placement is fully booked for those dates. Pick another start date.");

        var campaign = new SponsorshipCampaign
        {
            UserId = userId,
            ApplicationId = r.ApplicationId,
            Placement = plan.Placement!.Value,
            TargetCategoryId = categoryId,
            TargetApplicationId = targetAppId,
            InventoryKey = key,
            StartsAt = start,
            EndsAt = end,
            PriceCents = plan.PriceCents,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.SponsorshipCampaigns.Add(campaign);
        Audit(userId, "campaign.reserve", "SponsorshipCampaign", campaign.Id, new { plan.Key, key, start, end });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return campaign.Id;
    }

    private Task LockAsync(string key, CancellationToken ct)
    {
        // FNV-1a: stable across processes (string.GetHashCode is randomised per process).
        var hash = 14695981039346656037UL;
        foreach (var ch in key) hash = (hash ^ ch) * 1099511628211UL;
        var id = unchecked((long)hash);
        return db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({id})", ct);
    }

    public async Task CancelCampaignAsync(Guid userId, Guid id, CancellationToken ct)
    {
        var c = await db.SponsorshipCampaigns.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct)
            ?? throw new NotFoundException("Campaign", id.ToString());
        if (c.Status != CampaignStatus.AwaitingPayment) throw new ConflictException("Paid campaigns can only be cancelled by support.");
        c.Status = CampaignStatus.Canceled;
        c.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    // ---------- Checkout ----------

    /// <summary>Validates a purchase before sending the member to checkout and records what it is for.</summary>
    public async Task<CheckoutTicket> PrepareCheckoutAsync(Guid userId, string planKey, Guid? targetId, CancellationToken ct)
    {
        var plan = PricingCatalog.ByKey(planKey) ?? throw new BadRequestException("Unknown plan.");
        var now = clock.GetUtcNow();
        switch (plan.Kind)
        {
            case EntitlementKind.FastTrack:
            {
                var s = await db.Submissions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == targetId && x.SubmittedByUserId == userId, ct)
                    ?? throw new NotFoundException("Submission", $"{targetId}");
                if (!Reviewable.Contains(s.Status)) throw new ConflictException("Fast Review is only available while a submission is waiting for review.");
                if (s.IsPriority) throw new ConflictException("This submission already has Fast Review.");
                break;
            }

            case EntitlementKind.Featured or EntitlementKind.Growth:
            {
                if (targetId is not { } appId || !await OwnedApplicationIds(userId).ContainsAsync(appId, ct))
                    throw new ForbiddenException("You can only promote products you own.");
                var active = await db.BillingEntitlements.AnyAsync(e => e.UserId == userId && e.TargetId == appId
                    && (e.Kind == EntitlementKind.Featured || e.Kind == EntitlementKind.Growth) && !e.IsCanceled
                    && (e.Expiration == null || e.Expiration > now), ct);
                if (active) throw new ConflictException("This product already has an active subscription. Change plans from Billing.");
                break;
            }

            default:
            {
                var c = await db.SponsorshipCampaigns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == targetId && x.UserId == userId, ct)
                    ?? throw new NotFoundException("Campaign", $"{targetId}");
                if (PricingCatalog.ByPlacement(c.Placement)?.Key != plan.Key) throw new BadRequestException("Plan does not match the campaign.");
                if (c.Status != CampaignStatus.AwaitingPayment || !c.HoldsInventory(now))
                    throw new ConflictException("This reservation has expired. Please reserve the placement again.");
                break;
            }
        }

        // Re-use the open intent for the same thing so repeated clicks do not stack up.
        var intent = await db.CheckoutIntents.FirstOrDefaultAsync(i => i.UserId == userId && i.Kind == plan.Kind && i.TargetId == targetId
            && i.ConsumedAt == null && i.CreatedAt > now.AddHours(-2), ct);
        if (intent is null)
        {
            intent = new CheckoutIntent { UserId = userId, Kind = plan.Kind, TargetId = targetId, CreatedAt = now };
            db.CheckoutIntents.Add(intent);
            await db.SaveChangesAsync(ct);
        }

        return new CheckoutTicket(plan, intent.Id);
    }

    /// <summary>
    /// Called by the payment webhook after the entitlement row is saved. Idempotent: a retried or duplicated event
    /// finds the entitlement already linked and only re-derives its effect.
    /// </summary>
    public async Task OnLicenseAsync(Guid entitlementId, CancellationToken ct)
    {
        var e = await db.BillingEntitlements.FirstOrDefaultAsync(x => x.Id == entitlementId, ct);
        if (e is null) return;
        var now = clock.GetUtcNow();

        if (e.TargetId is null && e.Kind != EntitlementKind.Unknown && !e.IsCanceled)
        {
            var intent = await db.CheckoutIntents
                .Where(i => i.UserId == e.UserId && i.Kind == e.Kind && i.ConsumedAt == null && i.CreatedAt > now.AddDays(-2))
                .OrderByDescending(i => i.CreatedAt).FirstOrDefaultAsync(ct);
            if (intent is not null)
            {
                intent.ConsumedAt = now;
                intent.EntitlementId = e.Id;
                e.TargetId = intent.TargetId;
                e.UpdatedAt = now;
            }
        }

        if (e.Kind is EntitlementKind.Featured or EntitlementKind.Growth && e.IsActive(now)
            && !await db.FoundingVendors.AnyAsync(f => f.UserId == e.UserId, ct))
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await LockAsync("founding", ct);
            if (await db.FoundingVendors.CountAsync(ct) < PricingCatalog.FoundingVendorLimit)
            {
                db.FoundingVendors.Add(new FoundingVendor
                {
                    UserId = e.UserId, Plan = e.Kind, PriceCents = PricingCatalog.ByKind(e.Kind)!.PriceCents, GrantedAt = now,
                });
            }

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        else
        {
            await db.SaveChangesAsync(ct);
        }

        await ReapplyAsync(e.Id, ct);
    }

    /// <summary>Manually applies an unlinked purchase (e.g. paid with another e-mail tab) to a target.</summary>
    public async Task AssignAsync(Guid userId, Guid entitlementId, Guid targetId, CancellationToken ct)
    {
        var e = await db.BillingEntitlements.FirstOrDefaultAsync(x => x.Id == entitlementId && x.UserId == userId, ct)
            ?? throw new NotFoundException("Purchase", entitlementId.ToString());
        if (!e.IsActive(clock.GetUtcNow())) throw new ConflictException("This purchase is no longer active.");
        if (e.TargetId is not null && e.Kind is not (EntitlementKind.Featured or EntitlementKind.Growth))
            throw new ConflictException("This purchase has already been used.");

        switch (e.Kind)
        {
            case EntitlementKind.Featured:
            case EntitlementKind.Growth:
            case EntitlementKind.LaunchBoost:
                if (!await OwnedApplicationIds(userId).ContainsAsync(targetId, ct))
                    throw new ForbiddenException("You can only boost products you submitted.");
                break;
            case EntitlementKind.FastTrack:
                var pending = await db.Submissions.AnyAsync(s => s.Id == targetId && s.SubmittedByUserId == userId
                    && Reviewable.Contains(s.Status) && !s.IsPriority, ct);
                if (!pending) throw new BadRequestException("Fast Review applies to one of your submissions that is waiting for review.");
                break;
            case EntitlementKind.HomepageSpotlight or EntitlementKind.CategorySponsorship
                or EntitlementKind.CompetitorSponsorship or EntitlementKind.AlternativeCard:
                var campaign = await db.SponsorshipCampaigns.FirstOrDefaultAsync(c => c.Id == targetId && c.UserId == userId
                    && c.Status == CampaignStatus.AwaitingPayment, ct) ?? throw new BadRequestException("Choose one of your unpaid campaigns.");
                if (PricingCatalog.ByPlacement(campaign.Placement)?.Kind != e.Kind) throw new BadRequestException("This purchase is for a different placement.");
                break;
            default:
                throw new BadRequestException("This purchase is not linked to a known plan yet. Contact support.");
        }

        var previous = e.TargetId;
        e.TargetId = targetId;
        e.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        if (previous is { } old && old != targetId) await RecomputeSubscriptionAsync(old, ct);
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
            case EntitlementKind.Growth:
                await RecomputeSubscriptionAsync(target, ct);
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
                if (submission is not null && !submission.IsPriority && Reviewable.Contains(submission.Status))
                {
                    // The 24-hour promise starts when the payment is confirmed, not when the submission was made.
                    submission.IsPriority = true;
                    submission.PriorityPaidAt = now;
                    submission.ReviewDeadline = now.AddHours(PricingCatalog.FastReviewHours);
                    submission.UpdatedAt = now;
                    Audit(e.UserId, "submission.fast-review-paid", "Submission", submission.Id, new { e.FsLicenseId });
                    await db.SaveChangesAsync(ct);
                }

                break;
            case EntitlementKind.HomepageSpotlight or EntitlementKind.CategorySponsorship
                or EntitlementKind.CompetitorSponsorship or EntitlementKind.AlternativeCard:
                await ApplyCampaignPaymentAsync(e, target, now, ct);
                break;
        }
    }

    private async Task ApplyCampaignPaymentAsync(BillingEntitlement e, Guid campaignId, DateTimeOffset now, CancellationToken ct)
    {
        var c = await db.SponsorshipCampaigns.FirstOrDefaultAsync(x => x.Id == campaignId, ct);
        if (c is null) return;
        if (e.IsCanceled)
        {
            // Refunded: the placement stops.
            if (c.Status is CampaignStatus.PendingApproval or CampaignStatus.Approved or CampaignStatus.AwaitingPayment)
            {
                c.Status = CampaignStatus.Canceled;
                c.UpdatedAt = now;
                Audit(e.UserId, "campaign.refunded", "SponsorshipCampaign", c.Id, new { e.FsLicenseId });
                await db.SaveChangesAsync(ct);
                await cache.RemoveAsync(SponsorService.CacheKey, ct);
            }

            return;
        }

        if (c.Status != CampaignStatus.AwaitingPayment) return; // already applied (webhook retry)

        // Paid after the hold lapsed: keep the booking only if the slot is still free, otherwise move to the next free window.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockAsync(c.InventoryKey, ct);
        var plan = PricingCatalog.ByPlacement(c.Placement)!;
        var taken = await TakenAsync(c.InventoryKey, now, c.Id, ct);
        if (c.StartsAt < now)
        {
            c.StartsAt = now;
            c.EndsAt = now.AddDays(plan.DurationDays!.Value);
        }

        for (var guard = 0; guard < 52 && PricingCatalog.Overlapping(taken, c.StartsAt, c.EndsAt) >= plan.InventoryLimit; guard++)
        {
            var nextFree = taken.Where(t => t.Start < c.EndsAt && c.StartsAt < t.End).Min(t => t.End);
            c.StartsAt = nextFree;
            c.EndsAt = nextFree.AddDays(plan.DurationDays!.Value);
        }

        c.Status = CampaignStatus.PendingApproval;
        c.EntitlementId = e.Id;
        c.PaidAt = now;
        c.UpdatedAt = now;
        Audit(e.UserId, "campaign.paid", "SponsorshipCampaign", c.Id, new { e.FsLicenseId, c.StartsAt, c.EndsAt });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    /// <summary>Featured and Growth last as long as the longest active subscription of that tier applied to the product.</summary>
    private async Task RecomputeSubscriptionAsync(Guid appId, CancellationToken ct)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == appId, ct);
        if (app is null) return;
        var now = clock.GetUtcNow();
        var active = await db.BillingEntitlements
            .Where(x => x.TargetId == appId && (x.Kind == EntitlementKind.Featured || x.Kind == EntitlementKind.Growth)
                && !x.IsCanceled && (x.Expiration == null || x.Expiration > now))
            .Select(x => new { x.Kind, x.Expiration })
            .ToListAsync(ct);
        // A subscription without an expiration date stays on until the payment provider reports otherwise.
        DateTimeOffset? Until(IEnumerable<DateTimeOffset?> e) => e.Any() ? e.Max(x => x ?? now.AddDays(31)) : null;
        app.GrowthUntil = Until(active.Where(a => a.Kind == EntitlementKind.Growth).Select(a => a.Expiration));
        app.FeaturedUntil = Until(active.Select(a => a.Expiration)); // Growth includes everything in Featured.
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(app.Slug, ct);
    }

    // ---------- Moderation ----------

    public async Task<IReadOnlyList<AdminCampaignRow>> AdminCampaignsAsync(string? state, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var query = db.SponsorshipCampaigns.AsNoTracking();
        query = state switch
        {
            "pending" => query.Where(c => c.Status == CampaignStatus.PendingApproval),
            "live" => query.Where(c => c.Status == CampaignStatus.Approved && c.EndsAt > now),
            _ => query.Where(c => c.Status != CampaignStatus.AwaitingPayment || c.CreatedAt > now.AddDays(-1)),
        };
        var rows = await query.OrderBy(c => c.Status == CampaignStatus.PendingApproval ? 0 : 1).ThenBy(c => c.StartsAt).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.ApplicationId).Concat(rows.Where(r => r.TargetApplicationId != null).Select(r => r.TargetApplicationId!.Value)).Distinct().ToList();
        var apps = await db.Applications.Where(a => ids.Contains(a.Id)).Select(a => new { a.Id, a.Name, a.Slug }).ToDictionaryAsync(a => a.Id, ct);
        var catIds = rows.Where(r => r.TargetCategoryId != null).Select(r => r.TargetCategoryId!.Value).ToList();
        var cats = await db.Categories.Where(c => catIds.Contains(c.Id)).Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        return rows.Select(c => new AdminCampaignRow(c.Id, PricingCatalog.ByPlacement(c.Placement)!.Name, c.UserId,
            apps.GetValueOrDefault(c.ApplicationId)?.Name ?? "?", apps.GetValueOrDefault(c.ApplicationId)?.Slug ?? "",
            c.TargetCategoryId is { } cat ? cats.GetValueOrDefault(cat) : c.TargetApplicationId is { } t ? apps.GetValueOrDefault(t)?.Name : "Homepage",
            c.StartsAt, c.EndsAt, CampaignState(c, now), c.PriceCents, c.PaidAt, c.ModeratorNote, c.CreatedAt)).ToList();
    }

    /// <summary>approve | reject. Approving a campaign whose start date passed while waiting restarts it now, keeping its full length.</summary>
    public async Task DecideCampaignAsync(Guid actorId, Guid id, string decision, string? note, CancellationToken ct)
    {
        var c = await db.SponsorshipCampaigns.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Campaign", id.ToString());
        if (c.Status != CampaignStatus.PendingApproval) throw new ConflictException("Only paid campaigns waiting for approval can be decided.");
        var now = clock.GetUtcNow();
        switch (decision)
        {
            case "approve":
                if (c.StartsAt < now)
                {
                    var length = c.EndsAt - c.StartsAt;
                    c.StartsAt = now;
                    c.EndsAt = now + length;
                }

                c.Status = CampaignStatus.Approved;
                break;
            case "reject":
                if (string.IsNullOrWhiteSpace(note)) throw new BadRequestException("Tell the sponsor why (they will see this note).");
                c.Status = CampaignStatus.Rejected;
                break;
            default:
                throw new BadRequestException("Decision must be approve or reject.");
        }

        c.ModeratorNote = note?.Trim();
        c.ModeratedAt = now;
        c.ModeratedByUserId = actorId;
        c.UpdatedAt = now;
        Audit(actorId, $"campaign.{decision}", "SponsorshipCampaign", c.Id, new { note });
        await db.SaveChangesAsync(ct);
        await cache.RemoveAsync(SponsorService.CacheKey, ct);
    }

    // ---------- Analytics ----------

    public sealed record DailyPoint(DateOnly Day, int ProfileViews, int Impressions, int Clicks);

    public sealed record AnalyticsDto(int Days, int ProfileViews, int Impressions, int Clicks, double ClickThroughRate, IReadOnlyList<DailyPoint> Daily);

    public async Task<AnalyticsDto> AnalyticsAsync(Guid userId, int days, Guid? applicationId, CancellationToken ct)
    {
        days = Math.Clamp(days, 7, 90);
        var now = clock.GetUtcNow();
        var from = DateOnly.FromDateTime(now.UtcDateTime.Date.AddDays(-(days - 1)));
        var owned = await OwnedApplicationIds(userId).ToListAsync(ct);
        if (applicationId is { } only)
        {
            if (!owned.Contains(only)) throw new ForbiddenException("You can only view analytics for products you own.");
            owned = [only];
        }

        var stats = await db.SponsorStats.Where(s => owned.Contains(s.ApplicationId) && s.Day >= from)
            .GroupBy(s => s.Day).Select(g => new { Day = g.Key, I = g.Sum(x => x.Impressions), C = g.Sum(x => x.Clicks) })
            .ToListAsync(ct);
        var paths = await db.Applications.Where(a => owned.Contains(a.Id)).Select(a => "/software/" + a.Slug).ToListAsync(ct);
        var fromInstant = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var views = await db.PageViews.Where(v => paths.Contains(v.Path) && v.CreatedAt >= fromInstant)
            .GroupBy(v => v.CreatedAt.Date).Select(g => new { Day = g.Key, Count = g.Count() }).ToListAsync(ct);

        var daily = Enumerable.Range(0, days).Select(i => from.AddDays(i)).Select(d => new DailyPoint(d,
            views.Where(v => DateOnly.FromDateTime(v.Day) == d).Sum(v => v.Count),
            stats.Where(s => s.Day == d).Sum(s => s.I),
            stats.Where(s => s.Day == d).Sum(s => s.C))).ToList();
        var impressions = daily.Sum(d => d.Impressions);
        var clicks = daily.Sum(d => d.Clicks);
        return new AnalyticsDto(days, daily.Sum(d => d.ProfileViews), impressions, clicks,
            impressions == 0 ? 0 : Math.Round(100.0 * clicks / impressions, 2), daily);
    }

    private void Audit(Guid? actorId, string action, string entityType, Guid? entityId, object? data) =>
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            DataJson = data is null ? null : System.Text.Json.JsonSerializer.Serialize(data),
            CreatedAt = clock.GetUtcNow(),
        });

    private async Task InvalidateAsync(string slug, CancellationToken ct)
    {
        await cache.RemoveAsync(CacheKeys.Application(slug), ct);
        await cache.RemoveAsync(CacheKeys.Home, ct);
        await cache.RemoveAsync(SponsorService.CacheKey, ct);
    }
}
