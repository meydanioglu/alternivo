using Discovery.Application.Admin;
using Xunit;

namespace Discovery.UnitTests;

public class TrafficSourceTests
{
    [Fact]
    public void Utm_tags_are_read_from_the_query()
    {
        var t = TrafficSource.Utm("/software/notion?utm_source=Newsletter&utm_medium=email&utm_campaign=oct%20launch&x=1");
        Assert.Equal(new TrafficSource.UtmTags("newsletter", "email", "oct launch"), t);
    }

    [Theory]
    [InlineData("/pricing")]
    [InlineData("/pricing?utm_source=")]
    [InlineData(null)]
    public void Missing_utm_is_null(string? path) => Assert.Null(TrafficSource.Utm(path).Source);

    [Theory]
    [InlineData("google.com", null, "Google")]
    [InlineData("google.com.tr", null, "Google")]
    [InlineData("chatgpt.com", null, "ChatGPT")]
    [InlineData("t.co", null, "X / Twitter")]
    [InlineData("alternivo.com", null, "Direct")]
    [InlineData(null, null, "Direct")]
    [InlineData("google.com", "producthunt", "utm: producthunt")]
    [InlineData("someblog.dev", null, "someblog.dev")]
    public void Sources_are_labelled(string? host, string? utm, string expected) =>
        Assert.Equal(expected, TrafficSource.Label(host, utm, "alternivo.com"));

    private static readonly DailyTraffic[] Days =
    [
        new(new DateOnly(2026, 10, 25), 10, 5), // Sunday
        new(new DateOnly(2026, 10, 26), 20, 8), // Monday
        new(new DateOnly(2026, 10, 27), 30, 9),
        new(new DateOnly(2026, 11, 1), 4, 2),
    ];

    [Fact]
    public void Weeks_start_on_monday()
    {
        var w = TrafficSource.Bucket(Days, "week");
        Assert.Equal([new(new DateOnly(2026, 10, 19), 10, 5), new(new DateOnly(2026, 10, 26), 54, 19)], w);
    }

    [Fact]
    public void Months_sum_by_calendar_month()
    {
        var m = TrafficSource.Bucket(Days, "month");
        Assert.Equal([new(new DateOnly(2026, 10, 1), 60, 22), new(new DateOnly(2026, 11, 1), 4, 2)], m);
    }

    [Fact]
    public void Unknown_grain_falls_back_to_days() => Assert.Same(Days, TrafficSource.Bucket(Days, "year"));
}
