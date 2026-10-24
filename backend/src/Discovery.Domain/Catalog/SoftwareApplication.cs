using Discovery.Domain.Common;

namespace Discovery.Domain.Catalog;

/// <summary>
/// A software product listed in the catalog. Stored in the "Applications" table.
/// (Named SoftwareApplication to avoid clashing with the Discovery.Application namespace.)
/// </summary>
public class SoftwareApplication : Entity, ISoftDeletable
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LogoUrl { get; set; }
    /// <summary>Approved SEO title/description overrides (null = generated from the summary).</summary>
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    /// <summary>Approved long-form sections (features, use cases, pros/cons, FAQ) as JSON; see ContentSections.</summary>
    public string? ContentJson { get; set; }
    public DateTimeOffset? ContentApprovedAt { get; set; }
    /// <summary>
    /// Imported listing whose text has not been reviewed yet: still public, but kept out of search indexes
    /// (noindex + omitted from sitemaps) until an editor approves its content or verifies it.
    /// </summary>
    public bool NeedsContentReview { get; set; }
    /// <summary>Paid "Featured" placement (labelled as sponsored; never changes organic ranking).</summary>
    public DateTimeOffset? FeaturedUntil { get; set; }
    /// <summary>Paid launch boost: pinned (labelled sponsored) on the weekly launch board of its launch week.</summary>
    public bool LaunchBoosted { get; set; }
    /// <summary>Paid "Growth" subscription: also shown (labelled) on alternatives pages of products in the same category.</summary>
    public DateTimeOffset? GrowthUntil { get; set; }
    public string? Developer { get; set; }

    public PricingModel Pricing { get; set; }
    public Guid? LicenseId { get; set; }
    public License? License { get; set; }

    public bool IsSelfHostable { get; set; }
    public bool IsPrivacyFocused { get; set; }
    public bool HasOfflineSupport { get; set; }

    public PublicationStatus Status { get; set; } = PublicationStatus.Draft;
    public VerificationStatus Verification { get; set; } = VerificationStatus.Unverified;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? LastVerifiedAt { get; set; }
    /// <summary>First public release date of the product, when known.</summary>
    public DateOnly? ReleasedOn { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    /// <summary>Editorial quality signal 0–100 set by editors. Used as one transparent ranking input.</summary>
    public int EditorialScore { get; set; }

    /// <summary>True for development-only demo records. Never shown in production builds.</summary>
    public bool IsDemoData { get; set; }

    // Denormalised counters, always recomputed from source tables (never hand-edited).
    public int LikeCount { get; set; }
    public int ReviewCount { get; set; }
    public decimal? RatingAverage { get; set; }

    /// <summary>Concatenated aliases, tags and categories used by full-text and trigram search.</summary>
    public string SearchText { get; set; } = string.Empty;

    /// <summary>Optimistic concurrency token (mapped to PostgreSQL xmin).</summary>
    public uint Version { get; set; }

    public List<ApplicationAlias> Aliases { get; set; } = [];
    public List<ApplicationScreenshot> Screenshots { get; set; } = [];
    public List<ApplicationPlatform> Platforms { get; set; } = [];
    public List<ApplicationCategory> Categories { get; set; } = [];
    public List<ApplicationFeature> Features { get; set; } = [];
    public List<ApplicationTag> Tags { get; set; } = [];

    public bool IsOpenSource => License?.IsOpenSource ?? false;

    public bool IsPubliclyVisible => Status == PublicationStatus.Published && DeletedAt is null;

    public void Publish(DateTimeOffset now)
    {
        Status = PublicationStatus.Published;
        PublishedAt ??= now;
        UpdatedAt = now;
    }

    public void Archive(DateTimeOffset now)
    {
        Status = PublicationStatus.Archived;
        UpdatedAt = now;
    }
}

public class ApplicationAlias
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ApplicationId { get; set; }
    public required string Alias { get; set; }
}

public class ApplicationScreenshot
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ApplicationId { get; set; }
    public required string Url { get; set; }
    public string? Caption { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public int SortOrder { get; set; }
}

public class ApplicationPlatform
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid PlatformId { get; set; }
    public Platform? Platform { get; set; }
}

public class ApplicationCategory
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public bool IsPrimary { get; set; }
}

public class ApplicationFeature
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid FeatureId { get; set; }
    public Feature? Feature { get; set; }
}

public class ApplicationTag
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid TagId { get; set; }
    public Tag? Tag { get; set; }
}
