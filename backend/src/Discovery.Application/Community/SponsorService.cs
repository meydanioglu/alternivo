using Discovery.Application.Abstractions;
using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Community;

public sealed record SponsoredItemDto(ApplicationSummaryDto Application, string Placement, string Label);

public sealed record SponsorEventRequest(Guid ApplicationId, string Placement);

/// <summary>
/// Serves paid placements next to (never inside) organic lists, and counts impressions and clicks.
/// Counting is de-duplicated per visitor, product and placement for 30 minutes, so reloads are not counted twice.
/// </summary>
public sealed class SponsorService(IAppDbContext db, ICacheService cache, CatalogService catalog, TimeProvider clock)
{
    public const string CacheKey = "sponsors:v1";
    private static readonly TimeSpan Dedupe = TimeSpan.FromMinutes(30);

    private sealed record Live(Guid AppId, SponsorPlacement Placement, string? Key, Guid? CategoryId, bool Growth);

    /// <summary>Everything running right now, cached briefly; rotation happens per request on top of it.</summary>
    private Task<List<Live>> LiveAsync(CancellationToken ct) => cache.GetOrCreateAsync(CacheKey, TimeSpan.FromMinutes(2), async c =>
    {
        var now = clock.GetUtcNow();
        var visible = catalog.Visible();
        var campaigns = await db.SponsorshipCampaigns
            .Where(x => x.Status == CampaignStatus.Approved && x.StartsAt <= now && x.EndsAt > now && visible.Any(a => a.Id == x.ApplicationId))
            .Select(x => new Live(x.ApplicationId, x.Placement, x.InventoryKey, x.TargetCategoryId, false)).ToListAsync(c);
        var subscribers = await visible.Where(a => a.FeaturedUntil > now)
            .Select(a => new Live(a.Id, SponsorPlacement.Subscription, null,
                a.Categories.Where(x => x.IsPrimary).Select(x => (Guid?)x.CategoryId).FirstOrDefault(), a.GrowthUntil > now))
            .ToListAsync(c);
        return campaigns.Concat(subscribers).ToList();
    }, ct);

    /// <summary>slot: "home", "category:{slug}" or "alternatives:{app slug}".</summary>
    public async Task<IReadOnlyList<SponsoredItemDto>> ForSlotAsync(string slot, CancellationToken ct)
    {
        var live = await LiveAsync(ct);
        if (live.Count == 0) return [];
        var parts = slot.Split(':', 2);
        List<(Live Item, string Label)> picked;
        switch (parts[0])
        {
            case "home":
                picked = Rotate(live.Where(l => l.Placement == SponsorPlacement.HomepageSpotlight), 3).Select(l => (l, "Spotlight")).ToList();
                break;
            case "category" when parts.Length == 2:
            {
                var catId = await db.Categories.Where(x => x.Slug == parts[1]).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(ct);
                if (catId is null) return [];
                var paid = Rotate(live.Where(l => l.Placement == SponsorPlacement.Category && l.CategoryId == catId), 2);
                var subs = Rotate(live.Where(l => l.Placement == SponsorPlacement.Subscription && l.CategoryId == catId), 3);
                picked = paid.Concat(subs).DistinctBy(l => l.AppId).Take(3).Select(l => (l, "Sponsored")).ToList();
                break;
            }

            case "alternatives" when parts.Length == 2:
            {
                var target = await db.Applications.Where(a => a.Slug == parts[1])
                    .Select(a => new { a.Id, Cat = a.Categories.Where(x => x.IsPrimary).Select(x => (Guid?)x.CategoryId).FirstOrDefault() })
                    .FirstOrDefaultAsync(ct);
                if (target is null) return [];
                var paid = live.Where(l => l.Key == $"cmp:{target.Id}" || l.Key == $"alt:{target.Id}").ToList();
                var growth = Rotate(live.Where(l => l.Placement == SponsorPlacement.Subscription && l.Growth && l.CategoryId == target.Cat && target.Cat != null), 2);
                picked = paid.Concat(growth).Where(l => l.AppId != target.Id).DistinctBy(l => l.AppId).Take(2)
                    .Select(l => (l, "Sponsored alternative")).ToList();
                break;
            }

            default:
                return [];
        }

        var summaries = await catalog.LoadSummariesAsync(picked.Select(p => p.Item.AppId).ToList(), ct);
        return picked.Where(p => summaries.ContainsKey(p.Item.AppId))
            .Select(p => new SponsoredItemDto(summaries[p.Item.AppId], p.Item.Placement.ToString(), p.Label)).ToList();
    }

    private static IEnumerable<Live> Rotate(IEnumerable<Live> items, int take) => items.OrderBy(_ => Random.Shared.Next()).Take(take);

    /// <summary>Counts impressions; returns how many were new (not seen from this visitor in the last 30 minutes).</summary>
    public async Task<int> RecordImpressionsAsync(string visitorKey, IReadOnlyList<SponsorEventRequest> events, CancellationToken ct)
    {
        var counted = 0;
        foreach (var e in events.Take(10).DistinctBy(e => (e.ApplicationId, e.Placement)))
        {
            if (!Enum.TryParse<SponsorPlacement>(e.Placement, out var placement)) continue;
            if (!await FirstTimeAsync($"spi:{visitorKey}:{e.ApplicationId}:{placement}", ct)) continue;
            await IncrementAsync(e.ApplicationId, placement, impressions: 1, clicks: 0, ct);
            counted++;
        }

        return counted;
    }

    /// <summary>Records a sponsored click and returns the product's website to redirect to.</summary>
    public async Task<string> RecordClickAsync(string visitorKey, Guid applicationId, string placementName, CancellationToken ct)
    {
        var url = await catalog.Visible().Where(a => a.Id == applicationId).Select(a => a.WebsiteUrl).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Application", applicationId.ToString());
        if (Enum.TryParse<SponsorPlacement>(placementName, out var placement)
            && await FirstTimeAsync($"spc:{visitorKey}:{applicationId}:{placement}", ct))
        {
            await IncrementAsync(applicationId, placement, impressions: 0, clicks: 1, ct);
        }

        return url;
    }

    private async Task<bool> FirstTimeAsync(string key, CancellationToken ct)
    {
        var fresh = false;
        await cache.GetOrCreateAsync(key, Dedupe, _ =>
        {
            fresh = true;
            return Task.FromResult(true);
        }, ct);
        return fresh;
    }

    private Task IncrementAsync(Guid appId, SponsorPlacement placement, int impressions, int clicks, CancellationToken ct)
    {
        var day = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var p = (int)placement;
        // Atomic upsert: concurrent requests add to the same daily row instead of racing on insert.
        return db.Database.ExecuteSqlAsync($"""
            INSERT INTO "SponsorStats" ("ApplicationId", "Placement", "Day", "Impressions", "Clicks")
            VALUES ({appId}, {p}, {day}, {impressions}, {clicks})
            ON CONFLICT ("ApplicationId", "Placement", "Day")
            DO UPDATE SET "Impressions" = "SponsorStats"."Impressions" + EXCLUDED."Impressions",
                          "Clicks" = "SponsorStats"."Clicks" + EXCLUDED."Clicks"
            """, ct);
    }
}
