using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;

namespace Discovery.Infrastructure.Persistence;

internal sealed class SoftwareApplicationConfiguration : IEntityTypeConfiguration<SoftwareApplication>
{
    public void Configure(EntityTypeBuilder<SoftwareApplication> b)
    {
        b.ToTable("Applications", t =>
            t.HasCheckConstraint("CK_Applications_EditorialScore", "\"EditorialScore\" BETWEEN 0 AND 100"));
        b.HasKey(a => a.Id);
        b.Property(a => a.Slug).HasMaxLength(120).IsRequired();
        b.HasIndex(a => a.Slug).IsUnique();
        b.Property(a => a.Name).HasMaxLength(100).IsRequired();
        b.Property(a => a.ShortDescription).HasMaxLength(200).IsRequired();
        b.Property(a => a.Description).HasMaxLength(10_000);
        b.Property(a => a.WebsiteUrl).HasMaxLength(2048);
        b.Property(a => a.LogoUrl).HasMaxLength(2048);
        b.Property(a => a.Developer).HasMaxLength(120);
        b.Property(a => a.SearchText).HasMaxLength(4000).IsRequired();
        b.Property(a => a.RatingAverage).HasPrecision(3, 2);
        b.Property(a => a.Version).IsRowVersion();
        b.Ignore(a => a.IsOpenSource);
        b.Ignore(a => a.IsPubliclyVisible);

        b.HasOne(a => a.License).WithMany().HasForeignKey(a => a.LicenseId).OnDelete(DeleteBehavior.SetNull);

        // Full-text document (simple config: product names are not English words) + trigram indexes for typo tolerance.
        b.Property<NpgsqlTsVector>("SearchVector")
            .HasComputedColumnSql(
                "setweight(to_tsvector('simple', coalesce(\"Name\", '')), 'A') || " +
                "setweight(to_tsvector('simple', coalesce(\"SearchText\", '')), 'B') || " +
                "setweight(to_tsvector('simple', coalesce(\"ShortDescription\", '')), 'C')",
                stored: true);
        b.HasIndex("SearchVector").HasMethod("gin");
        b.HasIndex(a => a.Name).HasMethod("gin").HasOperators("gin_trgm_ops").HasDatabaseName("IX_Applications_Name_trgm");
        b.HasIndex(a => a.SearchText).HasMethod("gin").HasOperators("gin_trgm_ops").HasDatabaseName("IX_Applications_SearchText_trgm");

        b.HasIndex(a => new { a.Status, a.DeletedAt });
        b.HasIndex(a => a.PublishedAt);
        b.HasIndex(a => a.LikeCount);

        b.HasMany(a => a.Aliases).WithOne().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(a => a.Screenshots).WithOne().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(a => a.Platforms).WithOne(x => x.Application).HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(a => a.Categories).WithOne(x => x.Application).HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(a => a.Features).WithOne(x => x.Application).HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(a => a.Tags).WithOne(x => x.Application).HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ApplicationAliasConfiguration : IEntityTypeConfiguration<ApplicationAlias>
{
    public void Configure(EntityTypeBuilder<ApplicationAlias> b)
    {
        b.ToTable("ApplicationAliases");
        b.Property(x => x.Alias).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.ApplicationId, x.Alias }).IsUnique();
    }
}

internal sealed class ApplicationScreenshotConfiguration : IEntityTypeConfiguration<ApplicationScreenshot>
{
    public void Configure(EntityTypeBuilder<ApplicationScreenshot> b)
    {
        b.ToTable("ApplicationScreenshots");
        b.Property(x => x.Url).HasMaxLength(2048).IsRequired();
        b.Property(x => x.Caption).HasMaxLength(200);
    }
}

internal sealed class ApplicationPlatformConfiguration : IEntityTypeConfiguration<ApplicationPlatform>
{
    public void Configure(EntityTypeBuilder<ApplicationPlatform> b)
    {
        b.ToTable("ApplicationPlatforms");
        b.HasKey(x => new { x.ApplicationId, x.PlatformId });
        b.HasOne(x => x.Platform).WithMany().HasForeignKey(x => x.PlatformId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.PlatformId);
    }
}

internal sealed class ApplicationCategoryConfiguration : IEntityTypeConfiguration<ApplicationCategory>
{
    public void Configure(EntityTypeBuilder<ApplicationCategory> b)
    {
        b.ToTable("ApplicationCategories");
        b.HasKey(x => new { x.ApplicationId, x.CategoryId });
        b.HasOne(x => x.Category).WithMany(c => c.Applications).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.CategoryId);
    }
}

internal sealed class ApplicationFeatureConfiguration : IEntityTypeConfiguration<ApplicationFeature>
{
    public void Configure(EntityTypeBuilder<ApplicationFeature> b)
    {
        b.ToTable("ApplicationFeatures");
        b.HasKey(x => new { x.ApplicationId, x.FeatureId });
        b.HasOne(x => x.Feature).WithMany().HasForeignKey(x => x.FeatureId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.FeatureId);
    }
}

internal sealed class ApplicationTagConfiguration : IEntityTypeConfiguration<ApplicationTag>
{
    public void Configure(EntityTypeBuilder<ApplicationTag> b)
    {
        b.ToTable("ApplicationTags");
        b.HasKey(x => new { x.ApplicationId, x.TagId });
        b.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.TagId);
    }
}

internal sealed class PlatformConfiguration : IEntityTypeConfiguration<Platform>
{
    public void Configure(EntityTypeBuilder<Platform> b)
    {
        b.ToTable("Platforms");
        b.Property(x => x.Slug).HasMaxLength(60).IsRequired();
        b.Property(x => x.Name).HasMaxLength(60).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
    }
}

internal sealed class LicenseConfiguration : IEntityTypeConfiguration<License>
{
    public void Configure(EntityTypeBuilder<License> b)
    {
        b.ToTable("Licenses");
        b.Property(x => x.Slug).HasMaxLength(60).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Family).HasMaxLength(30).IsRequired();
        b.Property(x => x.SpdxId).HasMaxLength(60);
        b.HasIndex(x => x.Slug).IsUnique();
    }
}

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.ToTable("Categories");
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.SeoIntro).HasMaxLength(4000);
        b.Property(x => x.Icon).HasMaxLength(60);
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => x.Name).HasMethod("gin").HasOperators("gin_trgm_ops").HasDatabaseName("IX_Categories_Name_trgm");
        b.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class FeatureConfiguration : IEntityTypeConfiguration<Feature>
{
    public void Configure(EntityTypeBuilder<Feature> b)
    {
        b.ToTable("Features");
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
    }
}

internal sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> b)
    {
        b.ToTable("Tags");
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
    }
}

internal sealed class AlternativeRelationshipConfiguration : IEntityTypeConfiguration<AlternativeRelationship>
{
    public void Configure(EntityTypeBuilder<AlternativeRelationship> b)
    {
        b.ToTable("AlternativeRelationships", t =>
            t.HasCheckConstraint("CK_AlternativeRelationships_NotSelf", "\"SourceApplicationId\" <> \"AlternativeApplicationId\""));
        b.Property(x => x.Note).HasMaxLength(500);
        b.HasOne(x => x.SourceApplication).WithMany().HasForeignKey(x => x.SourceApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.AlternativeApplication).WithMany().HasForeignKey(x => x.AlternativeApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.SourceApplicationId, x.AlternativeApplicationId }).IsUnique();
        b.HasIndex(x => new { x.AlternativeApplicationId, x.Status });
        b.HasIndex(x => x.Status);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.SuggestedByUserId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class AlternativeVoteConfiguration : IEntityTypeConfiguration<AlternativeVote>
{
    public void Configure(EntityTypeBuilder<AlternativeVote> b)
    {
        b.ToTable("AlternativeVotes");
        b.HasKey(x => new { x.RelationshipId, x.UserId });
        b.HasOne<AlternativeRelationship>().WithMany().HasForeignKey(x => x.RelationshipId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.UserId);
    }
}

internal sealed class ApplicationVoteConfiguration : IEntityTypeConfiguration<ApplicationVote>
{
    public void Configure(EntityTypeBuilder<ApplicationVote> b)
    {
        b.ToTable("ApplicationVotes");
        b.HasKey(x => new { x.ApplicationId, x.UserId });
        b.HasOne<SoftwareApplication>().WithMany().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.UserId);
    }
}

internal sealed class UserBookmarkConfiguration : IEntityTypeConfiguration<UserBookmark>
{
    public void Configure(EntityTypeBuilder<UserBookmark> b)
    {
        b.ToTable("UserBookmarks");
        b.HasKey(x => new { x.ApplicationId, x.UserId });
        b.HasOne(x => x.Application).WithMany().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.UserId, x.CreatedAt });
    }
}

internal sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> b)
    {
        b.ToTable("Reviews", t => t.HasCheckConstraint("CK_Reviews_Rating", "\"Rating\" BETWEEN 1 AND 5"));
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Body).HasMaxLength(5000).IsRequired();
        b.Property(x => x.Pros).HasMaxLength(1000);
        b.Property(x => x.Cons).HasMaxLength(1000);
        b.HasOne(x => x.Application).WithMany().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        // One review per user per application.
        b.HasIndex(x => new { x.ApplicationId, x.UserId }).IsUnique();
        b.HasIndex(x => new { x.Status, x.CreatedAt });
    }
}

internal sealed class SubmissionConfiguration : IEntityTypeConfiguration<Submission>
{
    public void Configure(EntityTypeBuilder<Submission> b)
    {
        b.ToTable("Submissions");
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.WebsiteUrl).HasMaxLength(2048).IsRequired();
        b.Property(x => x.Description).HasMaxLength(3000).IsRequired();
        b.Property(x => x.CategorySlug).HasMaxLength(120);
        b.Property(x => x.LicenseSlug).HasMaxLength(60);
        b.Property(x => x.ModeratorNote).HasMaxLength(2000);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.SubmittedByUserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.Status, x.CreatedAt });
        b.HasIndex(x => x.SubmittedByUserId);
    }
}

internal sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> b)
    {
        b.ToTable("Reports");
        b.Property(x => x.Reason).HasMaxLength(100).IsRequired();
        b.Property(x => x.Details).HasMaxLength(2000);
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ReporterUserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.Status, x.CreatedAt });
        b.HasIndex(x => new { x.TargetType, x.TargetId });
    }
}

internal sealed class SlugRedirectConfiguration : IEntityTypeConfiguration<SlugRedirect>
{
    public void Configure(EntityTypeBuilder<SlugRedirect> b)
    {
        b.ToTable("SlugRedirects", t =>
            t.HasCheckConstraint("CK_SlugRedirects_Status", "\"StatusCode\" IN (301, 308, 410)"));
        b.Property(x => x.FromPath).HasMaxLength(500).IsRequired();
        b.Property(x => x.ToPath).HasMaxLength(500);
        b.HasIndex(x => x.FromPath).IsUnique();
    }
}

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("AuditLogs");
        b.Property(x => x.Action).HasMaxLength(100).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
        b.Property(x => x.DataJson).HasColumnType("jsonb");
        b.HasIndex(x => x.CreatedAt);
        b.HasIndex(x => new { x.EntityType, x.EntityId });
    }
}

internal sealed class SearchQueryLogConfiguration : IEntityTypeConfiguration<SearchQueryLog>
{
    public void Configure(EntityTypeBuilder<SearchQueryLog> b)
    {
        b.ToTable("SearchQueryLogs");
        b.Property(x => x.Id).UseIdentityAlwaysColumn();
        b.Property(x => x.Query).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.CreatedAt);
    }
}

internal sealed class PageViewConfiguration : IEntityTypeConfiguration<PageView>
{
    public void Configure(EntityTypeBuilder<PageView> b)
    {
        b.ToTable("PageViews");
        b.Property(x => x.Id).UseIdentityAlwaysColumn();
        b.Property(x => x.Path).HasMaxLength(300).IsRequired();
        b.Property(x => x.ReferrerHost).HasMaxLength(200);
        b.Property(x => x.VisitorId).HasMaxLength(32).IsRequired();
        b.Property(x => x.Device).HasMaxLength(20).IsRequired();
        b.HasIndex(x => x.CreatedAt);
    }
}

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        b.Property(x => x.DisplayName).HasMaxLength(60);
        b.Property(x => x.Bio).HasMaxLength(500);
        b.Property(x => x.AvatarUrl).HasMaxLength(2048);
        b.Property(x => x.Username).HasMaxLength(30);
        b.HasIndex(x => x.Username).IsUnique().HasFilter("\"Username\" IS NOT NULL");
        b.Property(x => x.Website).HasMaxLength(200);
        b.Property(x => x.Twitter).HasMaxLength(200);
        b.Property(x => x.GitHub).HasMaxLength(200);
        b.Property(x => x.LinkedIn).HasMaxLength(200);
        b.Property(x => x.IsProfilePublic).HasDefaultValue(true);
        b.Property(x => x.ShowLikes).HasDefaultValue(true);
    }
}
