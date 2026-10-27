using Discovery.Infrastructure.Identity;
using Xunit;

namespace Discovery.UnitTests;

public class ConfirmEmailTests
{
    [Fact]
    public void Link_points_to_the_public_site_with_the_same_query()
    {
        var link = EmailSender.SiteConfirmationLink("https://alternivo.com/", "http://api:8080/api/v1/auth/confirmEmail?userId=abc&code=x%2By");
        Assert.Equal("https://alternivo.com/confirm-email?userId=abc&code=x%2By", link);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Without_a_site_url_the_api_link_is_kept(string? site)
    {
        const string api = "http://api:8080/api/v1/auth/confirmEmail?userId=abc&code=1";
        Assert.Equal(api, EmailSender.SiteConfirmationLink(site, api));
    }
}
