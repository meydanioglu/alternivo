using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Catalog;

internal static class Mapping
{
    /// <summary>Includes needed to map a summary. Always combine with AsSplitQuery().</summary>
    public static IQueryable<SoftwareApplication> WithSummaryIncludes(this IQueryable<SoftwareApplication> query) =>
        query
            .Include(a => a.License)
            .Include(a => a.Platforms).ThenInclude(p => p.Platform)
            .Include(a => a.Categories).ThenInclude(c => c.Category)
            .AsSplitQuery();

    /// <summary>Includes needed for detail pages, comparisons and alternatives ranking.</summary>
    public static IQueryable<SoftwareApplication> WithDetailIncludes(this IQueryable<SoftwareApplication> query) =>
        query
            .Include(a => a.License)
            .Include(a => a.Platforms).ThenInclude(p => p.Platform)
            .Include(a => a.Categories).ThenInclude(c => c.Category!).ThenInclude(c => c.Parent)
            .Include(a => a.Features).ThenInclude(f => f.Feature)
            .Include(a => a.Tags).ThenInclude(t => t.Tag)
            .Include(a => a.Aliases)
            .Include(a => a.Screenshots)
            .AsSplitQuery();

    public static ApplicationSummaryDto ToSummary(this SoftwareApplication a)
    {
        var primary = a.Categories.FirstOrDefault(c => c.IsPrimary) ?? a.Categories.FirstOrDefault();
        return new ApplicationSummaryDto(
            a.Id,
            a.Slug,
            a.Name,
            a.ShortDescription,
            a.LogoUrl,
            PricingNames.ToNames(a.Pricing),
            a.License is null ? null : a.License.ToRef(),
            a.IsOpenSource,
            a.IsSelfHostable,
            a.IsPrivacyFocused,
            a.HasOfflineSupport,
            a.Platforms
                .Where(p => p.Platform is not null)
                .OrderBy(p => p.Platform!.SortOrder)
                .Select(p => p.Platform!.ToRef())
                .ToArray(),
            primary?.Category is null ? null : new CategoryRef(primary.Category.Slug, primary.Category.Name),
            a.LikeCount,
            a.ReviewCount,
            a.RatingAverage);
    }

    public static PlatformRef ToRef(this Platform p) => new(p.Slug, p.Name, p.Kind.ToString().ToLowerInvariant());

    public static LicenseRef ToRef(this License l) => new(l.Slug, l.Name, l.IsOpenSource, l.Family);

    public static CategoryRef[] CategoryRefs(this SoftwareApplication a) =>
        a.Categories
            .Where(c => c.Category is not null)
            .OrderByDescending(c => c.IsPrimary)
            .ThenBy(c => c.Category!.Name)
            .Select(c => new CategoryRef(c.Category!.Slug, c.Category.Name))
            .ToArray();

    public static NamedRef[] FeatureRefs(this SoftwareApplication a) =>
        a.Features
            .Where(f => f.Feature is not null)
            .OrderBy(f => f.Feature!.Name)
            .Select(f => new NamedRef(f.Feature!.Slug, f.Feature.Name))
            .ToArray();

    public static ReviewDto ToDto(this Review r, string authorName, NamedRef? app = null) =>
        new(r.Id, r.ApplicationId, app, authorName, r.Rating, r.Title, r.Body, r.Pros, r.Cons,
            r.HelpfulCount, r.CreatedAt, r.UpdatedAt);

    public static string ToApiName(this RelationshipSource source) => source switch
    {
        RelationshipSource.Editorial => "editorial",
        RelationshipSource.Community => "community",
        _ => "import",
    };
}
