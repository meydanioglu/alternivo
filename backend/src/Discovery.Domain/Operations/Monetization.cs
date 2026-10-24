namespace Discovery.Domain.Operations;

public enum SponsorPlacement
{
    HomepageSpotlight = 0,
    Category = 1,
    Competitor = 2,
    AlternativeCard = 3,
    /// <summary>Featured / Growth subscription rotation (home strip, category pages, alternatives pages).</summary>
    Subscription = 4,
}

public enum CampaignStatus
{
    AwaitingPayment = 0,
    PendingApproval = 1,
    Approved = 2,
    Rejected = 3,
    Canceled = 4,
}

/// <summary>One sellable product. Default prices (USD cents); admins can set the charged price and currency for PayTR.</summary>
public sealed record PlanDefinition(
    string Key,
    EntitlementKind Kind,
    string Name,
    int PriceCents,
    bool Recurring,
    int? DurationDays,
    SponsorPlacement? Placement,
    /// <summary>How many campaigns may run at once per target (per category / competitor page; site-wide for the homepage).</summary>
    int? InventoryLimit);

/// <summary>The price list. Single source of truth for server-side validation, the pricing page and the vendor dashboard.</summary>
public static class PricingCatalog
{
    public const int FreeReviewDays = 15;
    public const int FastReviewHours = 24;
    public const int FoundingVendorLimit = 100;
    /// <summary>Unpaid campaign reservations hold inventory this long, so two sponsors cannot pay for the last slot.</summary>
    public static readonly TimeSpan ReservationHold = TimeSpan.FromMinutes(30);

    public static readonly IReadOnlyList<PlanDefinition> Plans =
    [
        new("fastReview", EntitlementKind.FastTrack, "Fast Review", 500, false, null, null, null),
        new("featured", EntitlementKind.Featured, "Featured", 900, true, 30, SponsorPlacement.Subscription, null),
        new("growth", EntitlementKind.Growth, "Growth", 1900, true, 30, SponsorPlacement.Subscription, null),
        new("homepageSpotlight", EntitlementKind.HomepageSpotlight, "Homepage Spotlight", 500, false, 7, SponsorPlacement.HomepageSpotlight, 3),
        new("categorySponsorship", EntitlementKind.CategorySponsorship, "Category Sponsorship", 700, false, 7, SponsorPlacement.Category, 2),
        new("competitorSponsorship", EntitlementKind.CompetitorSponsorship, "Competitor Page Sponsorship", 900, false, 7, SponsorPlacement.Competitor, 1),
        new("alternativeCard", EntitlementKind.AlternativeCard, "Sponsored Alternative Card", 1500, false, 30, SponsorPlacement.AlternativeCard, 1),
    ];

    public static PlanDefinition? ByKey(string? key) => Plans.FirstOrDefault(p => p.Key == key);

    public static PlanDefinition? ByKind(EntitlementKind kind) => Plans.FirstOrDefault(p => p.Kind == kind);

    public static PlanDefinition? ByPlacement(SponsorPlacement placement) =>
        placement == SponsorPlacement.Subscription ? null : Plans.FirstOrDefault(p => p.Placement == placement);

    /// <summary>Number of reservations overlapping [start, end) — inventory is free when this is below the limit.</summary>
    public static int Overlapping(IEnumerable<(DateTimeOffset Start, DateTimeOffset End)> taken, DateTimeOffset start, DateTimeOffset end) =>
        taken.Count(t => t.Start < end && start < t.End);

    /// <summary>Moderation order: paid reviews first by earliest deadline, then everything else oldest first; Id breaks ties.</summary>
    public static IOrderedEnumerable<T> ModerationOrder<T>(IEnumerable<T> items, Func<T, bool> priority, Func<T, DateTimeOffset?> deadline,
        Func<T, DateTimeOffset> created, Func<T, Guid> id) =>
        items.OrderByDescending(priority).ThenBy(x => priority(x) ? deadline(x) ?? DateTimeOffset.MaxValue : DateTimeOffset.MaxValue)
            .ThenBy(created).ThenBy(id);
}

public enum PaymentOrderStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
}

/// <summary>
/// One PayTR checkout. The order id (merchant_oid) is sent to PayTR; the signed payment notification for that id is
/// the only thing that marks it paid. Amount and target are fixed server-side when the order is created.
/// </summary>
public class PaymentOrder
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    /// <summary>merchant_oid: alphanumeric, unique.</summary>
    public required string MerchantOid { get; set; }
    public Guid UserId { get; set; }
    public required string PlanKey { get; set; }
    public EntitlementKind Kind { get; set; }
    /// <summary>Submission (Fast Review), application (Featured / Growth) or campaign (placements).</summary>
    public Guid? TargetId { get; set; }
    /// <summary>Minor units (kuruş / cents), as sent to PayTR.</summary>
    public int AmountMinor { get; set; }
    public required string Currency { get; set; }
    public bool TestMode { get; set; }
    public PaymentOrderStatus Status { get; set; } = PaymentOrderStatus.Pending;
    public int? PaidAmountMinor { get; set; }
    public string? PaymentType { get; set; }
    public string? FailedReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}

public class SponsorshipCampaign
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public Guid ApplicationId { get; set; }
    public SponsorPlacement Placement { get; set; }
    public Guid? TargetCategoryId { get; set; }
    public Guid? TargetApplicationId { get; set; }
    /// <summary>Inventory key: "home", "cat:{id}" or "app:{id}" — reservations are counted (and locked) per key.</summary>
    public required string InventoryKey { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public CampaignStatus Status { get; set; } = CampaignStatus.AwaitingPayment;
    public int PriceCents { get; set; }
    public Guid? EntitlementId { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? ModeratedAt { get; set; }
    public Guid? ModeratedByUserId { get; set; }
    public string? ModeratorNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Whether the campaign still holds inventory at <paramref name="now"/>.</summary>
    public bool HoldsInventory(DateTimeOffset now) => Status switch
    {
        CampaignStatus.AwaitingPayment => CreatedAt > now - PricingCatalog.ReservationHold,
        CampaignStatus.PendingApproval or CampaignStatus.Approved => EndsAt > now,
        _ => false,
    };

    public bool IsLive(DateTimeOffset now) => Status == CampaignStatus.Approved && StartsAt <= now && EndsAt > now;
}

/// <summary>Daily sponsor counters per product and placement (no personal data; de-duplicated before counting).</summary>
public class SponsorStat
{
    public long Id { get; set; }
    public Guid ApplicationId { get; set; }
    public SponsorPlacement Placement { get; set; }
    public DateOnly Day { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
}

/// <summary>First paying Featured/Growth vendors (up to PricingCatalog.FoundingVendorLimit).</summary>
public class FoundingVendor
{
    public Guid UserId { get; set; }
    public EntitlementKind Plan { get; set; }
    public int PriceCents { get; set; }
    public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;
}
