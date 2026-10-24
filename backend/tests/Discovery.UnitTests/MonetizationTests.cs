using Discovery.Application.Community;
using Discovery.Domain.Operations;
using Xunit;

namespace Discovery.UnitTests;

public class MonetizationTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData("fastReview", 500, false)]
    [InlineData("featured", 900, true)]
    [InlineData("growth", 1900, true)]
    [InlineData("homepageSpotlight", 500, false)]
    [InlineData("categorySponsorship", 700, false)]
    [InlineData("competitorSponsorship", 900, false)]
    [InlineData("alternativeCard", 1500, false)]
    public void Price_list_matches_published_pricing(string key, int cents, bool recurring)
    {
        var plan = PricingCatalog.ByKey(key)!;
        Assert.Equal(cents, plan.PriceCents);
        Assert.Equal(recurring, plan.Recurring);
    }

    [Fact]
    public void Unknown_plan_keys_are_rejected() => Assert.Null(PricingCatalog.ByKey("enterprise"));

    [Fact]
    public void Last_competitor_slot_cannot_be_taken_twice()
    {
        var limit = PricingCatalog.ByKey("competitorSponsorship")!.InventoryLimit;
        var taken = new List<(DateTimeOffset, DateTimeOffset)>();
        Assert.True(PricingCatalog.Overlapping(taken, Now, Now.AddDays(7)) < limit);
        taken.Add((Now, Now.AddDays(7)));
        Assert.False(PricingCatalog.Overlapping(taken, Now.AddDays(3), Now.AddDays(10)) < limit);
        // Back-to-back windows do not overlap.
        Assert.True(PricingCatalog.Overlapping(taken, Now.AddDays(7), Now.AddDays(14)) < limit);
    }

    [Fact]
    public void Homepage_allows_three_concurrent_spotlights()
    {
        var taken = Enumerable.Repeat((Now, Now.AddDays(7)), 2).ToList();
        Assert.True(PricingCatalog.Overlapping(taken, Now, Now.AddDays(7)) < 3);
        taken.Add((Now, Now.AddDays(7)));
        Assert.False(PricingCatalog.Overlapping(taken, Now, Now.AddDays(7)) < 3);
    }

    [Fact]
    public void Unpaid_reservation_releases_inventory_after_hold()
    {
        var c = new SponsorshipCampaign { InventoryKey = "home", CreatedAt = Now, StartsAt = Now, EndsAt = Now.AddDays(7) };
        Assert.True(c.HoldsInventory(Now.AddMinutes(29)));
        Assert.False(c.HoldsInventory(Now.AddMinutes(31)));
        Assert.Equal("reservation-expired", MakerService.CampaignState(c, Now.AddMinutes(31)));

        c.Status = CampaignStatus.PendingApproval; // paid: holds until the end date regardless of age
        Assert.True(c.HoldsInventory(Now.AddDays(3)));
    }

    [Fact]
    public void Campaign_states_follow_dates()
    {
        var c = new SponsorshipCampaign { InventoryKey = "home", Status = CampaignStatus.Approved, StartsAt = Now.AddDays(1), EndsAt = Now.AddDays(8) };
        Assert.Equal("scheduled", MakerService.CampaignState(c, Now));
        Assert.Equal("live", MakerService.CampaignState(c, Now.AddDays(2)));
        Assert.Equal("ended", MakerService.CampaignState(c, Now.AddDays(9)));
        Assert.True(c.IsLive(Now.AddDays(2)));
        Assert.False(c.IsLive(Now.AddDays(9)));
    }

    [Fact]
    public void Paid_reviews_come_first_by_earliest_deadline_then_standard_oldest_first()
    {
        var a = (Id: Guid.Parse("00000000-0000-0000-0000-000000000001"), Pri: false, Deadline: (DateTimeOffset?)Now.AddDays(15), Created: Now.AddDays(-5));
        var b = (Id: Guid.Parse("00000000-0000-0000-0000-000000000002"), Pri: true, Deadline: (DateTimeOffset?)Now.AddHours(20), Created: Now);
        var c = (Id: Guid.Parse("00000000-0000-0000-0000-000000000003"), Pri: true, Deadline: (DateTimeOffset?)Now.AddHours(2), Created: Now.AddHours(-1));
        var d = (Id: Guid.Parse("00000000-0000-0000-0000-000000000004"), Pri: false, Deadline: (DateTimeOffset?)Now.AddDays(10), Created: Now.AddDays(-9));

        var order = PricingCatalog.ModerationOrder(new[] { a, b, c, d }, x => x.Pri, x => x.Deadline, x => x.Created, x => x.Id)
            .Select(x => x.Id).ToList();
        Assert.Equal(new[] { c.Id, b.Id, d.Id, a.Id }, order);
    }
}
