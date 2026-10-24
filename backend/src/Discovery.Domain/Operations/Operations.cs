namespace Discovery.Domain.Operations;

/// <summary>Managed redirect for renamed/removed URLs. StatusCode 301, 308 or 410.</summary>
public class SlugRedirect
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string FromPath { get; set; }
    public string? ToPath { get; set; }
    public int StatusCode { get; set; } = 301;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid? UserId { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? DataJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Anonymous search analytics (query text and result count only, no user identifiers).</summary>
public class SearchQueryLog
{
    public long Id { get; set; }
    public required string Query { get; set; }
    public int ResultCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// One anonymous page view. No IP or cookie is stored: the visitor id is a salted daily hash,
/// so unique visitors can be counted per day without tracking people across days.
/// </summary>
public class PageView
{
    public long Id { get; set; }
    public required string Path { get; set; }
    public string? ReferrerHost { get; set; }
    public required string VisitorId { get; set; }
    public required string Device { get; set; }
    public Guid? UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum ImportStatus
{
    Queued = 0,
    Running = 1,
    Done = 2,
    Failed = 3,
    Skipped = 4,
}

/// <summary>
/// One product to import from its own official website. The worker fetches the page metadata and
/// logo, stores the images locally and creates (or refreshes) a draft application.
/// </summary>
public class ImportItem
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Url { get; set; }
    public string? Name { get; set; }
    public string? CategorySlug { get; set; }
    public ImportStatus Status { get; set; } = ImportStatus.Queued;
    public string? Error { get; set; }
    public int Attempts { get; set; }
    public Guid? ApplicationId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastSyncedAt { get; set; }
}

public enum ContentDraftStatus
{
    Queued = 0,
    Generating = 1,
    Ready = 2,
    Approved = 3,
    Rejected = 4,
    Failed = 5,
}

/// <summary>
/// AI-drafted SEO content for one application, grounded on text from the product's own website.
/// Nothing reaches the public page until an editor approves it.
/// </summary>
public class ContentDraft
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ApplicationId { get; set; }
    public ContentDraftStatus Status { get; set; } = ContentDraftStatus.Queued;
    public string? Error { get; set; }
    public int Attempts { get; set; }

    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    /// <summary>Features, use cases, pros, cons and FAQ as JSON (same shape as SoftwareApplication.ContentJson).</summary>
    public string? SectionsJson { get; set; }

    /// <summary>Where the facts came from and how much of it there was.</summary>
    public string? SourceUrl { get; set; }
    public int SourceChars { get; set; }
    public string? Model { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }

    public Guid RequestedByUserId { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Key/value site setting edited from the admin panel. Secret values are stored encrypted.</summary>
public class AppSetting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum EntitlementKind
{
    Unknown = 0,
    Featured = 1,
    FastTrack = 2,
    LaunchBoost = 3,
    Growth = 4,
    HomepageSpotlight = 5,
    CategorySponsorship = 6,
    CompetitorSponsorship = 7,
    AlternativeCard = 8,
}

/// <summary>
/// What a member has paid for: created when a PayTR payment notification confirms an order. Featured / Growth are
/// prepaid 30-day periods (buying again extends them); one-time purchases have no expiration.
/// </summary>
public class BillingEntitlement
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    /// <summary>The PaymentOrder that paid for it (unique: one entitlement per paid order).</summary>
    public Guid OrderId { get; set; }
    public EntitlementKind Kind { get; set; }
    public DateTimeOffset? Expiration { get; set; }
    /// <summary>Set by an admin after a refund.</summary>
    public bool IsCanceled { get; set; }
    /// <summary>Product, submission or campaign the purchase applies to.</summary>
    public Guid? TargetId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsActive(DateTimeOffset now) => !IsCanceled && (Expiration is null || Expiration > now);
}
