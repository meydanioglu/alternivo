using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Abstractions;

/// <summary>Persistence boundary used by application services. Implemented by Infrastructure.</summary>
public interface IAppDbContext
{
    DbSet<SoftwareApplication> Applications { get; }
    DbSet<ApplicationAlias> ApplicationAliases { get; }
    DbSet<ApplicationScreenshot> ApplicationScreenshots { get; }
    DbSet<ApplicationPlatform> ApplicationPlatforms { get; }
    DbSet<ApplicationCategory> ApplicationCategories { get; }
    DbSet<ApplicationFeature> ApplicationFeatures { get; }
    DbSet<ApplicationTag> ApplicationTags { get; }
    DbSet<Platform> Platforms { get; }
    DbSet<Category> Categories { get; }
    DbSet<Feature> Features { get; }
    DbSet<Tag> Tags { get; }
    DbSet<License> Licenses { get; }
    DbSet<AlternativeRelationship> AlternativeRelationships { get; }
    DbSet<AlternativeVote> AlternativeVotes { get; }
    DbSet<ApplicationVote> ApplicationVotes { get; }
    DbSet<UserBookmark> UserBookmarks { get; }
    DbSet<Review> Reviews { get; }
    DbSet<Submission> Submissions { get; }
    DbSet<Report> Reports { get; }
    DbSet<SlugRedirect> SlugRedirects { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<SearchQueryLog> SearchQueryLogs { get; }
    DbSet<PageView> PageViews { get; }
    DbSet<ImportItem> ImportItems { get; }
    DbSet<ContentDraft> ContentDrafts { get; }
    DbSet<BillingEntitlement> BillingEntitlements { get; }
    DbSet<PaymentOrder> PaymentOrders { get; }
    DbSet<SponsorshipCampaign> SponsorshipCampaigns { get; }
    DbSet<SponsorStat> SponsorStats { get; }
    DbSet<FoundingVendor> FoundingVendors { get; }
    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>Search provider boundary. The initial implementation uses PostgreSQL FTS + pg_trgm.</summary>
public interface ISearchProvider
{
    /// <summary>Returns ranked published application ids for the query.</summary>
    Task<(IReadOnlyList<Guid> Ids, int Total)> SearchApplicationsAsync(string query, int skip, int take, CancellationToken ct);

    /// <summary>Returns ranked category ids for the query.</summary>
    Task<IReadOnlyList<Guid>> SearchCategoriesAsync(string query, int take, CancellationToken ct);
}

/// <summary>Distributed cache with JSON serialisation and prefix-free explicit invalidation.</summary>
public interface ICacheService
{
    Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct);
    Task RemoveAsync(string key, CancellationToken ct);
}

/// <summary>Identity information resolved by the API for the current request.</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsInRole(string role);
}

/// <summary>Display names for user ids, resolved from the identity store.</summary>
public interface IUserDirectory
{
    Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(IEnumerable<Guid> userIds, CancellationToken ct);
}

public static class CacheKeys
{
    public const string Home = "home:v1";
    public const string Categories = "categories:v1";
    public const string Platforms = "platforms:v1";
    public static string Application(string slug) => $"app:v1:{slug}";
}
