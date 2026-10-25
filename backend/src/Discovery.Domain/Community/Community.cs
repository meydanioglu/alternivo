using Discovery.Domain.Catalog;
using Discovery.Domain.Common;

namespace Discovery.Domain.Community;

/// <summary>
/// A directed statement "Alternative is an alternative to Source".
/// Relationships are intentionally NOT assumed to be symmetric.
/// </summary>
public class AlternativeRelationship : Entity
{
    public Guid SourceApplicationId { get; set; }
    public SoftwareApplication? SourceApplication { get; set; }
    public Guid AlternativeApplicationId { get; set; }
    public SoftwareApplication? AlternativeApplication { get; set; }

    public RelationshipSource Source { get; set; }
    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;
    /// <summary>Optional editor/community note on why this alternative fits.</summary>
    public string? Note { get; set; }
    public Guid? SuggestedByUserId { get; set; }
    public Guid? ModeratedByUserId { get; set; }
    public DateTimeOffset? ModeratedAt { get; set; }
    public int VoteCount { get; set; }
    /// <summary>Editor's pick: shown first on the source's alternatives page (default sort) and labelled as such.</summary>
    public bool IsPinned { get; set; }
}

/// <summary>One user agreeing with an alternative relationship. Composite key prevents duplicates.</summary>
public class AlternativeVote
{
    public Guid RelationshipId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>A "like" on an application. Composite key prevents duplicates.</summary>
public class ApplicationVote
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class UserBookmark
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Review : Entity
{
    public Guid ApplicationId { get; set; }
    public SoftwareApplication? Application { get; set; }
    public Guid UserId { get; set; }
    /// <summary>1–5, enforced by a database check constraint.</summary>
    public int Rating { get; set; }
    public required string Title { get; set; }
    public required string Body { get; set; }
    public string? Pros { get; set; }
    public string? Cons { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Published;
    public int HelpfulCount { get; set; }
}

public class Submission : Entity
{
    public Guid SubmittedByUserId { get; set; }
    public required string Name { get; set; }
    public required string WebsiteUrl { get; set; }
    public required string Description { get; set; }
    public string? CategorySlug { get; set; }
    public PricingModel Pricing { get; set; }
    public string? LicenseSlug { get; set; }
    public List<string> PlatformSlugs { get; set; } = [];
    public List<string> Tags { get; set; } = [];
    public List<string> ScreenshotUrls { get; set; } = [];
    public List<string> SuggestedAlternativeSlugs { get; set; } = [];
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;
    public string? ModeratorNote { get; set; }
    public Guid? PossibleDuplicateApplicationId { get; set; }
    public Guid? CreatedApplicationId { get; set; }
    public Guid? ModeratedByUserId { get; set; }
    public DateTimeOffset? ModeratedAt { get; set; }
    /// <summary>Paid Fast Review (verified by the payment webhook): shown first in the moderation queue.</summary>
    public bool IsPriority { get; set; }
    public DateTimeOffset? PriorityPaidAt { get; set; }
    /// <summary>Promised review date: 15 days after submission (free) or 24 hours after payment (Fast Review).</summary>
    public DateTimeOffset? ReviewDeadline { get; set; }
    public DateTimeOffset? ReviewStartedAt { get; set; }
    /// <summary>Moderators only; never shown to the submitter.</summary>
    public string? InternalNote { get; set; }
}

public class Report : Entity
{
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public required string Reason { get; set; }
    public string? Details { get; set; }
    public Guid ReporterUserId { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Open;
    public Guid? ResolvedByUserId { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
