using Discovery.Application.Abstractions;
using Discovery.Domain.Catalog;
using Discovery.Domain.Common;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options), IAppDbContext
{
    public DbSet<SoftwareApplication> Applications => Set<SoftwareApplication>();
    public DbSet<ApplicationAlias> ApplicationAliases => Set<ApplicationAlias>();
    public DbSet<ApplicationScreenshot> ApplicationScreenshots => Set<ApplicationScreenshot>();
    public DbSet<ApplicationPlatform> ApplicationPlatforms => Set<ApplicationPlatform>();
    public DbSet<ApplicationCategory> ApplicationCategories => Set<ApplicationCategory>();
    public DbSet<ApplicationFeature> ApplicationFeatures => Set<ApplicationFeature>();
    public DbSet<ApplicationTag> ApplicationTags => Set<ApplicationTag>();
    public DbSet<Platform> Platforms => Set<Platform>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<License> Licenses => Set<License>();
    public DbSet<AlternativeRelationship> AlternativeRelationships => Set<AlternativeRelationship>();
    public DbSet<AlternativeVote> AlternativeVotes => Set<AlternativeVote>();
    public DbSet<ApplicationVote> ApplicationVotes => Set<ApplicationVote>();
    public DbSet<UserBookmark> UserBookmarks => Set<UserBookmark>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<SlugRedirect> SlugRedirects => Set<SlugRedirect>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SearchQueryLog> SearchQueryLogs => Set<SearchQueryLog>();
    public DbSet<PageView> PageViews => Set<PageView>();
    public DbSet<ImportItem> ImportItems => Set<ImportItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasPostgresExtension("pg_trgm");
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
