using Discovery.Application.Catalog;
using Xunit;

namespace Discovery.UnitTests;

public class LaunchWeekTests
{
    [Theory]
    [InlineData("2026-10-23T09:00:00Z", "2026-10-19", "2026-W43")] // Friday
    [InlineData("2026-10-19T00:00:00Z", "2026-10-19", "2026-W43")] // Monday midnight belongs to the new week
    [InlineData("2026-10-25T23:59:59Z", "2026-10-19", "2026-W43")] // Sunday
    [InlineData("2027-01-01T12:00:00Z", "2026-12-28", "2026-W53")] // ISO year differs from calendar year
    public void WeekRange_starts_on_monday_utc(string instant, string expectedStart, string expectedKey)
    {
        var (start, end) = LaunchService.WeekRange(DateTimeOffset.Parse(instant));
        Assert.Equal(DateTimeOffset.Parse(expectedStart + "T00:00:00Z"), start);
        Assert.Equal(start.AddDays(7), end);
        Assert.Equal(expectedKey, LaunchService.WeekKey(start));
    }

    [Fact]
    public void ParseWeek_round_trips_week_keys()
    {
        var start = LaunchService.ParseWeek("2026-W43");
        Assert.Equal(DateTimeOffset.Parse("2026-10-19T00:00:00Z"), start);
        Assert.Equal("2026-W43", LaunchService.WeekKey(start!.Value));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2026-43")]
    [InlineData("2026-W54")]
    [InlineData("2026-W00")]
    [InlineData("abcd-W10")]
    public void ParseWeek_rejects_invalid_keys(string? key) => Assert.Null(LaunchService.ParseWeek(key));
}
