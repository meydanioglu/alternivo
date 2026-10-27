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

public class EmailTemplateTests
{
    [Fact]
    public void Confirmation_contains_the_link_as_button_and_plain_text()
    {
        const string link = "https://alternivo.com/confirm-email?userId=abc&code=x%2By";
        var mail = EmailTemplate.Confirmation("https://alternivo.com/", link);
        Assert.Contains("href=\"https://alternivo.com/confirm-email?userId=abc&amp;code=x%2By\"", mail.Html);
        Assert.Contains(link, mail.Text);
        Assert.Contains("https://alternivo.com/brand/logo-on-light.png", mail.Html);
        var preview = Environment.GetEnvironmentVariable("EMAIL_PREVIEW");
        if (!string.IsNullOrEmpty(preview)) File.WriteAllText(preview, mail.Html);
    }

    [Fact]
    public void Reset_code_is_html_encoded()
    {
        var mail = EmailTemplate.PasswordResetCode("https://alternivo.com", "<b>1</b>");
        Assert.DoesNotContain("<b>1</b>", mail.Html);
        Assert.Contains("&lt;b&gt;1&lt;/b&gt;", mail.Html);
    }
}
