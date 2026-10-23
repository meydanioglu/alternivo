using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using FluentValidation;

namespace Discovery.Application.Catalog;

public static class CatalogSorts
{
    public const string Relevance = "relevance";
    public const string Likes = "likes";
    public const string Rating = "rating";
    public const string Newest = "newest";
    public const string Name = "name";

    public static readonly string[] All = [Relevance, Likes, Rating, Newest, Name];
}

public static class LicenseFamilies
{
    public const string OpenSource = "open-source";
    public const string Proprietary = "proprietary";

    /// <summary>Public facet values. "open-source" matches any OSI license; the rest match License.Family.</summary>
    public static readonly string[] All = [OpenSource, Proprietary, "gpl", "mit", "apache", "other"];
}

public sealed class CatalogFilterValidator : AbstractValidator<CatalogFilter>
{
    public CatalogFilterValidator()
    {
        RuleFor(f => f.Platform).Must(a => a.Length <= 20).WithMessage("Too many platform values.");
        RuleForEach(f => f.Platform).Must(Slugs.IsValid).WithMessage("Invalid platform slug.");
        RuleForEach(f => f.Pricing).Must(p => PricingNames.All.Contains(p)).WithMessage("Unknown pricing value.");
        RuleForEach(f => f.License).Must(l => LicenseFamilies.All.Contains(l)).WithMessage("Unknown license value.");
        RuleFor(f => f.Category).Must(c => c is null || Slugs.IsValid(c)).WithMessage("Invalid category slug.");
        RuleFor(f => f.Feature).Must(a => a.Length <= 10).WithMessage("Too many feature values.");
        RuleForEach(f => f.Feature).Must(Slugs.IsValid).WithMessage("Invalid feature slug.");
        RuleFor(f => f.Tag).Must(a => a.Length <= 10).WithMessage("Too many tag values.");
        RuleForEach(f => f.Tag).Must(Slugs.IsValid).WithMessage("Invalid tag slug.");
        RuleFor(f => f.MinRating).InclusiveBetween(1m, 5m).When(f => f.MinRating is not null);
        RuleFor(f => f.Sort).Must(s => s is null || CatalogSorts.All.Contains(s)).WithMessage("Unknown sort value.");
        RuleFor(f => f.Page).InclusiveBetween(1, 10_000).When(f => f.Page is not null);
        RuleFor(f => f.PageSize).InclusiveBetween(1, Paging.MaxPageSize).When(f => f.PageSize is not null);
    }
}

internal static class CatalogFilterExtensions
{
    /// <summary>SQL-translatable filter used by catalog listings.</summary>
    public static IQueryable<SoftwareApplication> ApplyFilter(this IQueryable<SoftwareApplication> query, CatalogFilter f)
    {
        if (f.Platform.Length > 0)
        {
            var platforms = f.Platform;
            query = query.Where(a => a.Platforms.Any(p => platforms.Contains(p.Platform!.Slug)));
        }

        if (f.Pricing.Length > 0)
        {
            var flags = (int)PricingNames.Combine(f.Pricing);
            query = query.Where(a => ((int)a.Pricing & flags) != 0);
        }

        if (f.License.Length > 0)
        {
            var wantsOpen = f.License.Contains(LicenseFamilies.OpenSource);
            var families = f.License.Where(l => l != LicenseFamilies.OpenSource).ToArray();
            query = query.Where(a => a.License != null
                && ((wantsOpen && a.License.IsOpenSource) || families.Contains(a.License.Family)));
        }

        if (f.Category is { } category)
        {
            query = query.Where(a => a.Categories.Any(c =>
                c.Category!.Slug == category || (c.Category.Parent != null && c.Category.Parent.Slug == category)));
        }

        foreach (var feature in f.Feature)
        {
            var slug = feature;
            query = query.Where(a => a.Features.Any(x => x.Feature!.Slug == slug));
        }

        if (f.Tag.Length > 0)
        {
            var tags = f.Tag;
            query = query.Where(a => a.Tags.Any(t => tags.Contains(t.Tag!.Slug)));
        }

        if (f.SelfHosted == true)
        {
            query = query.Where(a => a.IsSelfHostable);
        }

        if (f.PrivacyFocused == true)
        {
            query = query.Where(a => a.IsPrivacyFocused);
        }

        if (f.Offline == true)
        {
            query = query.Where(a => a.HasOfflineSupport);
        }

        if (f.MinRating is { } min)
        {
            query = query.Where(a => a.RatingAverage != null && a.RatingAverage >= min);
        }

        return query;
    }

    public static IQueryable<SoftwareApplication> ApplySort(this IQueryable<SoftwareApplication> query, string? sort) =>
        sort switch
        {
            CatalogSorts.Likes => query.OrderByDescending(a => a.LikeCount).ThenByDescending(a => a.EditorialScore).ThenBy(a => a.Name),
            CatalogSorts.Rating => query.OrderByDescending(a => a.RatingAverage ?? 0).ThenByDescending(a => a.ReviewCount).ThenBy(a => a.Name),
            CatalogSorts.Newest => query.OrderByDescending(a => a.PublishedAt).ThenBy(a => a.Name),
            CatalogSorts.Name => query.OrderBy(a => a.Name),
            // Default "popular": real likes first, editorial score as a tie-breaker.
            _ => query.OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore).ThenBy(a => a.Name),
        };

    /// <summary>In-memory equivalent of <see cref="ApplyFilter"/> (requires detail includes).</summary>
    public static bool Matches(this SoftwareApplication a, CatalogFilter f)
    {
        if (f.Platform.Length > 0 && !a.Platforms.Any(p => p.Platform is not null && f.Platform.Contains(p.Platform.Slug)))
        {
            return false;
        }

        if (f.Pricing.Length > 0 && (a.Pricing & PricingNames.Combine(f.Pricing)) == PricingModel.None)
        {
            return false;
        }

        if (f.License.Length > 0)
        {
            var wantsOpen = f.License.Contains(LicenseFamilies.OpenSource);
            if (a.License is null || !((wantsOpen && a.License.IsOpenSource) || f.License.Contains(a.License.Family)))
            {
                return false;
            }
        }

        if (f.Category is { } category && !a.Categories.Any(c => c.Category is not null
                && (c.Category.Slug == category || c.Category.Parent?.Slug == category)))
        {
            return false;
        }

        if (f.Feature.Any(slug => !a.Features.Any(x => x.Feature?.Slug == slug)))
        {
            return false;
        }

        if (f.Tag.Length > 0 && !a.Tags.Any(t => t.Tag is not null && f.Tag.Contains(t.Tag.Slug)))
        {
            return false;
        }

        if ((f.SelfHosted == true && !a.IsSelfHostable)
            || (f.PrivacyFocused == true && !a.IsPrivacyFocused)
            || (f.Offline == true && !a.HasOfflineSupport))
        {
            return false;
        }

        return f.MinRating is not { } min || (a.RatingAverage is { } r && r >= min);
    }
}
