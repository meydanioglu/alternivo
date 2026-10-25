namespace Discovery.Application.Contracts;

public sealed record PlatformRef(string Slug, string Name, string Kind);

public sealed record CategoryRef(string Slug, string Name);

public sealed record LicenseRef(string Slug, string Name, bool IsOpenSource, string Family);

public sealed record NamedRef(string Slug, string Name);

public sealed record ApplicationSummaryDto(
    Guid Id,
    string Slug,
    string Name,
    string ShortDescription,
    string? LogoUrl,
    string[] Pricing,
    LicenseRef? License,
    bool IsOpenSource,
    bool IsSelfHostable,
    bool IsPrivacyFocused,
    bool HasOfflineSupport,
    PlatformRef[] Platforms,
    CategoryRef? PrimaryCategory,
    int LikeCount,
    int ReviewCount,
    decimal? RatingAverage,
    bool IsFeatured = false);

public sealed record ScreenshotDto(string Url, string? Caption, int Width, int Height);

public sealed record ApplicationDetailDto(
    ApplicationSummaryDto Summary,
    string? Description,
    string? WebsiteUrl,
    string? Developer,
    CategoryRef[] Categories,
    NamedRef[] Features,
    NamedRef[] Tags,
    string[] Aliases,
    ScreenshotDto[] Screenshots,
    string Verification,
    DateTimeOffset? LastVerifiedAt,
    DateTimeOffset? PublishedAt,
    DateTimeOffset UpdatedAt,
    DateOnly? ReleasedOn,
    int AlternativesCount,
    bool AlternativesIndexable,
    IReadOnlyList<ApplicationSummaryDto> TopAlternatives,
    IReadOnlyList<ApplicationSummaryDto> AlternativeTo,
    IReadOnlyList<ApplicationSummaryDto> Similar,
    IReadOnlyList<ReviewDto> RecentReviews,
    string? SeoTitle = null,
    string? SeoDescription = null,
    ContentSectionsDto? Content = null,
    bool Indexable = true);

public sealed record RankingSignalDto(string Name, double Value, double Weight);

public sealed record AlternativeItemDto(
    Guid RelationshipId,
    ApplicationSummaryDto Application,
    string Source,
    int VoteCount,
    string? Note,
    double Score,
    IReadOnlyList<RankingSignalDto> Signals,
    IReadOnlyList<string> Reasons,
    IReadOnlyList<string> SharedFeatures,
    bool Pinned = false);

public sealed record FacetValueDto(string Value, string Label, int Count);

public sealed record AlternativesFacetsDto(
    IReadOnlyList<FacetValueDto> Platforms,
    IReadOnlyList<FacetValueDto> Pricing,
    IReadOnlyList<FacetValueDto> Licenses,
    IReadOnlyList<FacetValueDto> Categories,
    IReadOnlyList<FacetValueDto> Features,
    IReadOnlyList<FacetValueDto> Attributes);

public sealed record AlternativesPageDto(
    ApplicationSummaryDto Source,
    int TotalAlternatives,
    bool IsIndexable,
    Common.PagedResult<AlternativeItemDto> Results,
    AlternativesFacetsDto Facets);

public sealed record CategoryDto(
    string Slug,
    string Name,
    string? Description,
    string? Icon,
    int ApplicationCount,
    bool IsFeatured,
    IReadOnlyList<CategoryDto> Children);

public sealed record CategoryDetailDto(
    string Slug,
    string Name,
    string? Description,
    string? SeoIntro,
    string? Icon,
    int ApplicationCount,
    CategoryRef? Parent,
    IReadOnlyList<CategoryDto> Children,
    IReadOnlyList<ApplicationSummaryDto> Featured,
    IReadOnlyList<ComparisonRefDto> Comparisons,
    IReadOnlyList<CategoryRef> Related);

public sealed record ComparisonRefDto(string Slug, IReadOnlyList<NamedRef> Applications);

public sealed record CompareApplicationDto(
    ApplicationSummaryDto Summary,
    string? WebsiteUrl,
    string? Developer,
    DateOnly? ReleasedOn,
    CategoryRef[] Categories,
    NamedRef[] Features);

public sealed record FeatureMatrixRowDto(string Slug, string Name, IReadOnlyList<string> PresentIn);

public sealed record CompareDto(
    string CanonicalSlug,
    IReadOnlyList<CompareApplicationDto> Applications,
    IReadOnlyList<FeatureMatrixRowDto> FeatureMatrix,
    IReadOnlyList<string> SharedFeatures,
    bool IsIndexable);

public sealed record ReviewDto(
    Guid Id,
    Guid ApplicationId,
    NamedRef? Application,
    string AuthorName,
    int Rating,
    string Title,
    string Body,
    string? Pros,
    string? Cons,
    int HelpfulCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record HomeStatsDto(int Applications, int Categories, int Alternatives, int Reviews);

public sealed record PopularSearchDto(string Query, int Count);

public sealed record HomeDto(
    HomeStatsDto Stats,
    IReadOnlyList<PopularSearchDto> PopularSearches,
    IReadOnlyList<ApplicationSummaryDto> Trending,
    IReadOnlyList<ApplicationSummaryDto> RecentlyAdded,
    IReadOnlyList<ApplicationSummaryDto> NewlyReleased,
    IReadOnlyList<CategoryDto> FeaturedCategories,
    IReadOnlyList<ApplicationSummaryDto> OpenSource,
    IReadOnlyList<ApplicationSummaryDto> Free,
    IReadOnlyList<ApplicationSummaryDto> AiTools,
    IReadOnlyList<ApplicationSummaryDto> CommunityFavorites,
    IReadOnlyList<ComparisonRefDto> Comparisons,
    IReadOnlyList<ReviewDto> RecentReviews);

public sealed record SuggestionDto(string Type, string Slug, string Name, string? Subtitle, string? LogoUrl);

public sealed record SearchResultDto(
    string Query,
    Common.PagedResult<ApplicationSummaryDto> Applications,
    IReadOnlyList<CategoryRef> Categories);

public sealed record SitemapEntryDto(string Path, DateTimeOffset LastModified);

public sealed record RedirectDto(string FromPath, string? ToPath, int StatusCode);

public sealed record UserProfileDto(Guid Id, string Email, string DisplayName, IReadOnlyList<string> Roles, bool EmailConfirmed);

public sealed record VoteStateDto(bool Voted, int Count);

public sealed record UserActivityDto(
    IReadOnlyList<ReviewDto> Reviews,
    IReadOnlyList<ApplicationSummaryDto> Liked,
    IReadOnlyList<ApplicationSummaryDto> Launched);

public sealed record ContentFeatureDto(string Name, string Description);

public sealed record ContentFaqDto(string Question, string Answer);

/// <summary>Editor-approved long-form product content. Every list may be empty when the source had no facts for it.</summary>
public sealed record ContentSectionsDto(
    IReadOnlyList<ContentFeatureDto> Features,
    IReadOnlyList<string> UseCases,
    IReadOnlyList<string> Audience,
    IReadOnlyList<string> Pros,
    IReadOnlyList<string> Cons,
    IReadOnlyList<ContentFaqDto> Faq);
