using Discovery.Application.Community;
using Xunit;

namespace Discovery.UnitTests;

public class ShareProofTests
{
    [Theory]
    [InlineData("<a href=\"https://alternivo.com/?utm_source=badge\"><img src=\"https://alternivo.com/badge/featured-light.svg\"></a>")]
    [InlineData("<a target=_blank href='https://www.alternivo.com/software/evonx'>x</a>")]
    [InlineData("<A HREF=\"http://alternivo.com\">x</A>")]
    public void Badge_link_is_found(string html) => Assert.True(ShareProof.BadgeLinked(html));

    [Theory]
    [InlineData("<p>alternivo.com</p>")]                                  // text, not a link
    [InlineData("<a href=\"https://alternivo.com.evil.io/\">x</a>")]        // look-alike host
    [InlineData("<a href=\"https://notalternivo.com/\">x</a>")]
    [InlineData("<img src=\"https://alternivo.com/badge/featured-light.svg\">")] // image without a link
    [InlineData(null)]
    public void Missing_or_fake_badge_is_rejected(string? html) => Assert.False(ShareProof.BadgeLinked(html));

    [Theory]
    [InlineData("https://x.com/maker/status/1850000000000000000")]
    [InlineData("https://twitter.com/maker/status/123")]
    [InlineData("https://substack.com/@maker/note/c-123")]
    [InlineData("https://maker.substack.com/p/we-are-on-alternivo")]
    public void Post_links_are_accepted(string url) => Assert.True(ShareProof.PostUrlValid(url));

    [Theory]
    [InlineData("https://x.com/maker")]                  // profile, not a post
    [InlineData("http://x.com/maker/status/123")]        // not https
    [InlineData("https://x.com.evil.io/a/status/1")]
    [InlineData("https://facebook.com/post/1")]
    [InlineData("https://maker.substack.com/")]
    [InlineData("")]
    public void Other_links_are_rejected(string url) => Assert.False(ShareProof.PostUrlValid(url));

    private static readonly DateTimeOffset Created = new(2026, 10, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Deadline_moves_to_seven_days_after_submission() =>
        Assert.Equal(Created.AddDays(7), ShareProof.SharedDeadline(Created, Created.AddDays(15), Created.AddDays(2), 7));

    [Fact]
    public void Deadline_is_never_in_the_past()
    {
        var now = Created.AddDays(10);
        Assert.Equal(now.AddDays(1), ShareProof.SharedDeadline(Created, Created.AddDays(15), now, 7));
    }

    [Fact]
    public void Deadline_is_never_later_than_before() =>
        Assert.Equal(Created.AddDays(3), ShareProof.SharedDeadline(Created, Created.AddDays(3), Created.AddDays(1), 7));
}
