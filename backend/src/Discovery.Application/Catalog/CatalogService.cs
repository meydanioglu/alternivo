using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Application.Ranking;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Discovery.Application.Catalog;

public sealed class CatalogService(
    IAppDbContext db,
    ICacheService cache,
    IUserDirectory users,
    IOptions<CatalogOptions> catalogOptions,
    IOptions<RankingOptions> rankingOptions,
    TimeProvider clock)
{
    private readonly CatalogOptions _catalog = catalogOptions.Value;
    private readonly RankingOptions _ranking = rankingOptions.Value;

    /// <summary>Published, non-deleted applications (demo rows only when explicitly enabled).</summary>
    internal IQueryable<SoftwareApplication> Visible()
    {
        var showDemo = _catalog.ShowDemoData;
        return db.Applications.Where(a =>
            a.Status == PublicationStatus.Published && a.DeletedAt == null && (showDemo || !a.IsDemoData));
    }

    public async Task<PagedResult<ApplicationSummaryDto>> ListAsync(CatalogFilter filter, CancellationToken ct)
    {
        var (page, pageSize) = Paging.Normalize(filter.Page, filter.PageSize);
        var query = Visible().ApplyFilter(filter);
        var total = await query.CountAsync(ct);
        var items = await query
            .ApplySort(filter.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .WithSummaryIncludes()
            .AsNoTracking()
            .ToListAsync(ct);

        return new PagedResult<ApplicationSummaryDto>(items.Select(a => a.ToSummary()).ToList(), page, pageSize, total);
    }

    public Task<ApplicationDetailDto> GetBySlugAsync(string slug, CancellationToken ct)
    {
        if (!Slugs.IsValid(slug))
        {
            throw new NotFoundException("Application", slug);
        }

        return cache.GetOrCreateAsync(
            CacheKeys.Application(slug),
            TimeSpan.FromSeconds(_catalog.DetailCacheSeconds),
            token => BuildDetailAsync(slug, token),
            ct);
    }

    private async Task<ApplicationDetailDto> BuildDetailAsync(string slug, CancellationToken ct)
    {
        var app = await Visible()
            .Where(a => a.Slug == slug)
            .WithDetailIncludes()
            .AsNoTracking()
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Application", slug);

        var ranked = await RankAlternativesAsync(app, new CatalogFilter(), ct);
        var topAlternatives = ranked.Items.Take(6).Select(i => i.Application.ToSummary()).ToList();

        var alternativeTo = await db.AlternativeRelationships
            .Where(r => r.AlternativeApplicationId == app.Id && r.Status == ModerationStatus.Approved)
            .Join(Visible(), r => r.SourceApplicationId, a => a.Id, (r, a) => new { r.VoteCount, a.Id, a.LikeCount })
            .OrderByDescending(x => x.VoteCount).ThenByDescending(x => x.LikeCount)
            .Select(x => x.Id)
            .Take(6)
            .ToListAsync(ct);

        var excluded = ranked.Items.Select(i => i.Application.Id).Append(app.Id).ToList();
        var primaryCategoryId = (app.Categories.FirstOrDefault(c => c.IsPrimary) ?? app.Categories.FirstOrDefault())?.CategoryId;
        var similarIds = primaryCategoryId is { } catId
            ? await Visible()
                .Where(a => !excluded.Contains(a.Id) && a.Categories.Any(c => c.CategoryId == catId))
                .OrderByDescending(a => a.LikeCount * 10 + a.EditorialScore)
                .Select(a => a.Id)
                .Take(6)
                .ToListAsync(ct)
            : [];

        var related = await LoadSummariesAsync(alternativeTo.Concat(similarIds).Distinct().ToList(), ct);

        var reviews = await db.Reviews
            .Where(r => r.ApplicationId == app.Id && r.Status == ReviewStatus.Published)
            .OrderByDescending(r => r.CreatedAt)
            .Take(5)
            .AsNoTracking()
            .ToListAsync(ct);
        var names = await users.GetDisplayNamesAsync(reviews.Select(r => r.UserId), ct);

        return new ApplicationDetailDto(
            app.ToSummary(),
            app.Description,
            app.WebsiteUrl,
            app.Developer,
            app.CategoryRefs(),
            app.FeatureRefs(),
            app.Tags.Where(t => t.Tag is not null).OrderBy(t => t.Tag!.Name).Select(t => new NamedRef(t.Tag!.Slug, t.Tag.Name)).ToArray(),
            app.Aliases.Select(a => a.Alias).Order().ToArray(),
            app.Screenshots.OrderBy(s => s.SortOrder).Select(s => new ScreenshotDto(s.Url, s.Caption, s.Width, s.Height)).ToArray(),
            app.Verification == VerificationStatus.Verified ? "verified" : "unverified",
            app.LastVerifiedAt,
            app.PublishedAt,
            app.UpdatedAt,
            app.ReleasedOn,
            ranked.Total,
            ranked.Total >= _ranking.MinAlternativesForIndexing,
            topAlternatives,
            alternativeTo.Where(related.ContainsKey).Select(id => related[id]).ToList(),
            similarIds.Where(related.ContainsKey).Select(id => related[id]).ToList(),
            reviews.Select(r => r.ToDto(names.GetValueOrDefault(r.UserId, "Community member"))).ToList(),
            app.SeoTitle,
            app.SeoDescription,
            ContentJson.Parse(app.ContentJson),
            !app.NeedsContentReview);
    }

    public async Task<AlternativesPageDto> GetAlternativesAsync(string slug, CatalogFilter filter, CancellationToken ct)
    {
        var app = await Visible()
            .Where(a => a.Slug == slug)
            .WithDetailIncludes()
            .AsNoTracking()
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Application", slug);

        var ranked = await RankAlternativesAsync(app, filter, ct);
        var (page, pageSize) = Paging.Normalize(filter.Page, filter.PageSize);
        var pageItems = ranked.Items
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new AlternativeItemDto(
                i.RelationshipId,
                i.Application.ToSummary(),
                i.Source.ToApiName(),
                i.VoteCount,
                i.Note,
                i.Score,
                i.Signals,
                BuildReasons(app, i.Application, i.SharedFeatures.Count),
                i.SharedFeatures,
                i.Pinned))
            .ToList();

        return new AlternativesPageDto(
            app.ToSummary(),
            ranked.Total,
            ranked.Total >= _ranking.MinAlternativesForIndexing && !app.NeedsContentReview,
            new PagedResult<AlternativeItemDto>(pageItems, page, pageSize, ranked.Items.Count),
            BuildFacets(ranked.All));
    }

    private sealed record RankedAlternative(
        Guid RelationshipId,
        SoftwareApplication Application,
        RelationshipSource Source,
        int VoteCount,
        string? Note,
        double Score,
        IReadOnlyList<RankingSignalDto> Signals,
        IReadOnlyList<string> SharedFeatures,
        bool Pinned = false);

    private sealed record RankingResult(int Total, IReadOnlyList<SoftwareApplication> All, IReadOnlyList<RankedAlternative> Items);

    private async Task<RankingResult> RankAlternativesAsync(SoftwareApplication source, CatalogFilter filter, CancellationToken ct)
    {
        var relationships = await db.AlternativeRelationships
            .Where(r => r.SourceApplicationId == source.Id && r.Status == ModerationStatus.Approved)
            .AsNoTracking()
            .ToListAsync(ct);
        if (relationships.Count == 0)
        {
            return new RankingResult(0, [], []);
        }

        var ids = relationships.Select(r => r.AlternativeApplicationId).ToList();
        var apps = await Visible()
            .Where(a => ids.Contains(a.Id))
            .WithDetailIncludes()
            .AsNoTracking()
            .ToListAsync(ct);
        var byId = apps.ToDictionary(a => a.Id);
        var visibleRelationships = relationships.Where(r => byId.ContainsKey(r.AlternativeApplicationId)).ToList();

        var filtered = visibleRelationships.Where(r => byId[r.AlternativeApplicationId].Matches(filter)).ToList();
        var sourceProfile = Profile(source);
        var candidates = filtered.Select(r =>
        {
            var a = byId[r.AlternativeApplicationId];
            return new RankingCandidate(r.Id, Profile(a), r.VoteCount, a.LikeCount, a.RatingAverage, a.ReviewCount,
                a.LastVerifiedAt ?? a.UpdatedAt, a.EditorialScore);
        }).ToList();

        var ranked = AlternativeRanker.Rank(sourceProfile, candidates, _ranking, clock.GetUtcNow());
        var relById = filtered.ToDictionary(r => r.Id);
        var sourceFeatureIds = sourceProfile.FeatureIds;

        IEnumerable<RankedAlternative> items = ranked.Select(r =>
        {
            var rel = relById[r.Key];
            var alt = byId[rel.AlternativeApplicationId];
            var shared = alt.Features
                .Where(f => sourceFeatureIds.Contains(f.FeatureId) && f.Feature is not null)
                .Select(f => f.Feature!.Name)
                .Order()
                .ToList();
            return new RankedAlternative(rel.Id, alt, rel.Source, rel.VoteCount, rel.Note, r.Score, r.Signals, shared, rel.IsPinned);
        });

        items = filter.Sort switch
        {
            CatalogSorts.Likes => items.OrderByDescending(i => i.Application.LikeCount).ThenByDescending(i => i.Score),
            CatalogSorts.Rating => items.OrderByDescending(i => i.Application.RatingAverage ?? 0).ThenByDescending(i => i.Score),
            CatalogSorts.Newest => items.OrderByDescending(i => i.Application.PublishedAt).ThenByDescending(i => i.Score),
            CatalogSorts.Name => items.OrderBy(i => i.Application.Name, StringComparer.OrdinalIgnoreCase),
            // Editor's picks lead the default (relevance) order; they are labelled on the page.
            _ => items.OrderByDescending(i => i.Pinned),
        };

        return new RankingResult(
            visibleRelationships.Count,
            visibleRelationships.Select(r => byId[r.AlternativeApplicationId]).ToList(),
            items.ToList());
    }

    private static RankingProfile Profile(SoftwareApplication a) => new(
        a.Features.Select(f => f.FeatureId).ToHashSet(),
        a.Platforms.Select(p => p.PlatformId).ToHashSet(),
        a.Categories.Select(c => c.CategoryId).ToHashSet());

    /// <summary>Human-readable, data-grounded reasons. Nothing here is invented: each line maps to a stored attribute.</summary>
    internal static IReadOnlyList<string> BuildReasons(SoftwareApplication source, SoftwareApplication alt, int sharedFeatureCount)
    {
        var reasons = new List<string>();
        if (alt.IsOpenSource && !source.IsOpenSource)
        {
            reasons.Add("Open source");
        }

        if (alt.Pricing.HasFlag(PricingModel.Free) && !source.Pricing.HasFlag(PricingModel.Free))
        {
            reasons.Add("Completely free");
        }
        else if (PricingNames.HasFreeOption(alt.Pricing) && !PricingNames.HasFreeOption(source.Pricing))
        {
            reasons.Add("Has a free plan");
        }

        if (alt.IsSelfHostable && !source.IsSelfHostable)
        {
            reasons.Add("Can be self-hosted");
        }

        if (alt.IsPrivacyFocused && !source.IsPrivacyFocused)
        {
            reasons.Add("Privacy-focused");
        }

        if (alt.HasOfflineSupport && !source.HasOfflineSupport)
        {
            reasons.Add("Works offline");
        }

        var sourcePlatforms = source.Platforms.Select(p => p.PlatformId).ToHashSet();
        var extraPlatforms = alt.Platforms
            .Where(p => !sourcePlatforms.Contains(p.PlatformId) && p.Platform is not null)
            .OrderBy(p => p.Platform!.SortOrder)
            .Select(p => p.Platform!.Name)
            .ToList();
        if (extraPlatforms.Count > 0)
        {
            reasons.Add($"Also available on {string.Join(", ", extraPlatforms)}");
        }

        if (source.Features.Count > 0 && sharedFeatureCount > 0)
        {
            reasons.Add($"Covers {sharedFeatureCount} of {source.Features.Count} {source.Name} features");
        }

        return reasons;
    }

    private static AlternativesFacetsDto BuildFacets(IReadOnlyList<SoftwareApplication> apps)
    {
        List<FacetValueDto> Count(Func<SoftwareApplication, IEnumerable<(string Value, string Label, int Order)>> selector, int take = 50) =>
            apps.SelectMany(selector)
                .GroupBy(x => x.Value)
                .Select(g => (Facet: new FacetValueDto(g.Key, g.First().Label, g.Count()), Order: g.First().Order))
                .OrderByDescending(x => x.Facet.Count)
                .ThenBy(x => x.Order)
                .Take(take)
                .Select(x => x.Facet)
                .ToList();

        var platforms = Count(a => a.Platforms.Where(p => p.Platform is not null)
            .Select(p => (p.Platform!.Slug, p.Platform.Name, p.Platform.SortOrder)));

        var pricing = Count(a => PricingNames.ToNames(a.Pricing)
            .Select(n => (n, PricingLabel(n), PricingNames.All.ToList().IndexOf(n))));

        var licenses = Count(a =>
        {
            var values = new List<(string, string, int)>();
            if (a.License is { } l)
            {
                if (l.IsOpenSource)
                {
                    values.Add((LicenseFamilies.OpenSource, "Open source", 0));
                }

                if (l.Family != LicenseFamilies.OpenSource)
                {
                    values.Add((l.Family, FamilyLabel(l.Family), Array.IndexOf(LicenseFamilies.All, l.Family)));
                }
            }

            return values;
        });

        var categories = Count(a => a.Categories.Where(c => c.Category is not null)
            .Select(c => (c.Category!.Slug, c.Category.Name, 0)), 12);

        var features = Count(a => a.Features.Where(f => f.Feature is not null)
            .Select(f => (f.Feature!.Slug, f.Feature.Name, 0)), 15);

        var attributes = Count(a =>
        {
            var values = new List<(string, string, int)>();
            if (a.IsSelfHostable) values.Add(("self-hosted", "Self-hostable", 0));
            if (a.IsPrivacyFocused) values.Add(("privacy-focused", "Privacy-focused", 1));
            if (a.HasOfflineSupport) values.Add(("offline", "Works offline", 2));
            return values;
        });

        return new AlternativesFacetsDto(platforms, pricing, licenses, categories, features, attributes);
    }

    internal static string PricingLabel(string name) => name switch
    {
        "free" => "Free",
        "freemium" => "Freemium",
        "paid" => "Paid",
        "free-trial" => "Free trial",
        "one-time-purchase" => "One-time purchase",
        "subscription" => "Subscription",
        _ => name,
    };

    internal static string FamilyLabel(string family) => family switch
    {
        "proprietary" => "Proprietary",
        "gpl" => "GPL",
        "mit" => "MIT",
        "apache" => "Apache",
        "open-source" => "Open source",
        _ => "Other",
    };

    public async Task<CompareDto> CompareAsync(IReadOnlyList<string> slugs, CancellationToken ct)
    {
        if (slugs.Count is < 2 or > 4 || slugs.Any(s => !Slugs.IsValid(s)) || slugs.Distinct().Count() != slugs.Count)
        {
            throw new BadRequestException("Compare between 2 and 4 different applications.");
        }

        var apps = await Visible()
            .Where(a => slugs.Contains(a.Slug))
            .WithDetailIncludes()
            .AsNoTracking()
            .ToListAsync(ct);
        var missing = slugs.Except(apps.Select(a => a.Slug)).FirstOrDefault();
        if (missing is not null)
        {
            throw new NotFoundException("Application", missing);
        }

        var ordered = apps.OrderBy(a => a.Slug, StringComparer.Ordinal).ToList();
        var matrix = ordered
            .SelectMany(a => a.Features.Where(f => f.Feature is not null).Select(f => (Feature: f.Feature!, App: a.Slug)))
            .GroupBy(x => x.Feature.Slug)
            .Select(g => new FeatureMatrixRowDto(g.Key, g.First().Feature.Name, g.Select(x => x.App).Distinct().ToList()))
            .OrderByDescending(r => r.PresentIn.Count)
            .ThenBy(r => r.Name)
            .ToList();

        var ids = ordered.Select(a => a.Id).ToList();
        var related = await db.AlternativeRelationships.AnyAsync(r =>
            r.Status == ModerationStatus.Approved
            && ids.Contains(r.SourceApplicationId) && ids.Contains(r.AlternativeApplicationId), ct);
        var shareCategory = ordered
            .Select(a => a.Categories.Select(c => c.CategoryId).ToHashSet())
            .Aggregate((x, y) => x.Intersect(y).ToHashSet())
            .Count > 0;

        return new CompareDto(
            ComparisonSlug.Canonical(ordered.Select(a => a.Slug)),
            ordered.Select(a => new CompareApplicationDto(a.ToSummary(), a.WebsiteUrl, a.Developer, a.ReleasedOn, a.CategoryRefs(), a.FeatureRefs())).ToList(),
            matrix,
            matrix.Where(r => r.PresentIn.Count == ordered.Count).Select(r => r.Name).ToList(),
            ordered.Count == 2 && (related || shareCategory) && ordered.All(a => !a.NeedsContentReview));
    }

    /// <summary>Popular canonical comparison pairs derived from approved relationships between visible apps.</summary>
    public async Task<IReadOnlyList<ComparisonRefDto>> PopularComparisonsAsync(Guid? categoryId, int take, CancellationToken ct)
    {
        var visible = Visible();
        var query =
            from r in db.AlternativeRelationships
            where r.Status == ModerationStatus.Approved
            join s in visible on r.SourceApplicationId equals s.Id
            join a in visible on r.AlternativeApplicationId equals a.Id
            select new { r.VoteCount, S = s, A = a };

        if (categoryId is { } cat)
        {
            query = query.Where(x => x.S.Categories.Any(c => c.CategoryId == cat) && x.A.Categories.Any(c => c.CategoryId == cat));
        }

        var rows = await query
            .OrderByDescending(x => x.VoteCount)
            .ThenByDescending(x => x.S.LikeCount + x.A.LikeCount)
            .ThenByDescending(x => x.S.EditorialScore + x.A.EditorialScore)
            .Select(x => new { SSlug = x.S.Slug, SName = x.S.Name, ASlug = x.A.Slug, AName = x.A.Name })
            .Take(take * 4)
            .ToListAsync(ct);

        return rows
            .Select(x => new[] { new NamedRef(x.SSlug, x.SName), new NamedRef(x.ASlug, x.AName) }
                .OrderBy(n => n.Slug, StringComparer.Ordinal).ToArray())
            .DistinctBy(pair => ComparisonSlug.Canonical(pair.Select(p => p.Slug)))
            .Take(take)
            .Select(pair => new ComparisonRefDto(ComparisonSlug.Canonical(pair.Select(p => p.Slug)), pair))
            .ToList();
    }

    internal async Task<Dictionary<Guid, ApplicationSummaryDto>> LoadSummariesAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct)
    {
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, ApplicationSummaryDto>();
        }

        var apps = await Visible()
            .Where(a => ids.Contains(a.Id))
            .WithSummaryIncludes()
            .AsNoTracking()
            .ToListAsync(ct);
        return apps.ToDictionary(a => a.Id, a => a.ToSummary());
    }

    internal async Task<IReadOnlyList<ApplicationSummaryDto>> TopAsync(
        Func<IQueryable<SoftwareApplication>, IQueryable<SoftwareApplication>> shape, int take, CancellationToken ct)
    {
        var apps = await shape(Visible())
            .Take(take)
            .WithSummaryIncludes()
            .AsNoTracking()
            .ToListAsync(ct);
        return apps.Select(a => a.ToSummary()).ToList();
    }
}
