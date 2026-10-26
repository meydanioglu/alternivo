namespace Discovery.Application.Admin;

public sealed record UpsertApplicationRequest(
    string Name,
    string? Slug,
    string ShortDescription,
    string? Description,
    string? WebsiteUrl,
    string? Developer,
    string[]? Pricing,
    string? LicenseSlug,
    bool IsSelfHostable,
    bool IsPrivacyFocused,
    bool HasOfflineSupport,
    int EditorialScore,
    DateOnly? ReleasedOn,
    string? PrimaryCategorySlug,
    string[]? CategorySlugs,
    string[]? PlatformSlugs,
    string[]? FeatureSlugs,
    string[]? TagSlugs,
    string[]? Aliases,
    bool MarkVerified,
    uint? Version,
    string? LogoUrl = null);

public sealed record AdminApplicationRow(
    Guid Id,
    string Slug,
    string Name,
    string Status,
    string Verification,
    int LikeCount,
    int ReviewCount,
    DateTimeOffset UpdatedAt);

public sealed record AdminSubmissionRow(
    Guid Id,
    string Name,
    string WebsiteUrl,
    string Description,
    string? CategorySlug,
    string[] Pricing,
    string? LicenseSlug,
    IReadOnlyList<string> Platforms,
    IReadOnlyList<string> Tags,
    IReadOnlyList<string> SuggestedAlternatives,
    string Status,
    string? ModeratorNote,
    Guid? PossibleDuplicateApplicationId,
    Guid SubmittedByUserId,
    DateTimeOffset CreatedAt,
    bool IsPriority = false,
    DateTimeOffset? PriorityPaidAt = null,
    DateTimeOffset? ReviewDeadline = null,
    bool Overdue = false,
    string? InternalNote = null,
    DateTimeOffset? ReviewStartedAt = null,
    /// <summary>none | badge | post — the maker shared Alternivo for a 7-day review; posts must be checked by hand.</summary>
    string ShareProof = "none",
    string? ShareProofUrl = null);

public sealed record AdminRelationshipRow(
    Guid Id,
    string SourceSlug,
    string SourceName,
    string AlternativeSlug,
    string AlternativeName,
    string Source,
    string Status,
    string? Note,
    int VoteCount,
    DateTimeOffset CreatedAt);

public sealed record AdminReviewRow(
    Guid Id,
    string ApplicationSlug,
    int Rating,
    string Title,
    string Body,
    string Status,
    Guid UserId,
    DateTimeOffset CreatedAt);

public sealed record AdminReportRow(
    Guid Id,
    string TargetType,
    Guid TargetId,
    string Reason,
    string? Details,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record AdminDashboardDto(
    int PublishedApplications,
    int DraftApplications,
    int PendingSubmissions,
    int PendingAlternatives,
    int OpenReports,
    int Reviews);

public sealed record CreateRedirectRequest(string FromPath, string? ToPath, int StatusCode);
