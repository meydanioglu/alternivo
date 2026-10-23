namespace Discovery.Application.Contracts;

/// <summary>Shared catalog filter parameters (bound from the query string).</summary>
public sealed class CatalogFilter
{
    public string[] Platform { get; set; } = [];
    public string[] Pricing { get; set; } = [];
    /// <summary>License families: open-source, proprietary, gpl, mit, apache, other.</summary>
    public string[] License { get; set; } = [];
    public string? Category { get; set; }
    public string[] Feature { get; set; } = [];
    public string[] Tag { get; set; } = [];
    public bool? SelfHosted { get; set; }
    public bool? PrivacyFocused { get; set; }
    public bool? Offline { get; set; }
    public decimal? MinRating { get; set; }
    /// <summary>relevance | likes | rating | newest | name</summary>
    public string? Sort { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }

    public bool HasAnyFilter =>
        Platform.Length > 0 || Pricing.Length > 0 || License.Length > 0 || Category is not null
        || Feature.Length > 0 || Tag.Length > 0 || SelfHosted == true || PrivacyFocused == true
        || Offline == true || MinRating is not null;
}

public sealed record CreateReviewRequest(int Rating, string Title, string Body, string? Pros, string? Cons);

public sealed record UpdateReviewRequest(int Rating, string Title, string Body, string? Pros, string? Cons);

public sealed record SuggestAlternativeRequest(string AlternativeSlug, string? Note);

public sealed record CreateSubmissionRequest(
    string Name,
    string WebsiteUrl,
    string Description,
    string? CategorySlug,
    string[]? Pricing,
    string? LicenseSlug,
    string[]? Platforms,
    string[]? Tags,
    string[]? ScreenshotUrls,
    string[]? SuggestedAlternatives);

public sealed record CreateReportRequest(string TargetType, Guid TargetId, string Reason, string? Details);

public sealed record ModerationDecisionRequest(string Decision, string? Note);
