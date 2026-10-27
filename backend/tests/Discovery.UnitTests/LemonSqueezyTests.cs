using System.Security.Cryptography;
using System.Text;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Billing;
using Xunit;

namespace Discovery.UnitTests;

public class LemonSqueezyTests
{
    private static readonly byte[] Body = Encoding.UTF8.GetBytes("{\"meta\":{\"event_name\":\"order_created\"}}");

    private static string Sign(string secret, byte[] body) =>
        Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), body));

    [Fact]
    public void Valid_signature_is_accepted() => Assert.True(LemonSqueezyGateway.SignatureValid("s3cret", Body, Sign("s3cret", Body)));

    [Fact]
    public void Uppercase_signature_is_accepted() =>
        Assert.True(LemonSqueezyGateway.SignatureValid("s3cret", Body, Sign("s3cret", Body).ToUpperInvariant()));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("deadbeef")]
    public void Missing_or_wrong_signature_is_rejected(string? signature) =>
        Assert.False(LemonSqueezyGateway.SignatureValid("s3cret", Body, signature));

    [Fact]
    public void Signature_with_another_secret_is_rejected() =>
        Assert.False(LemonSqueezyGateway.SignatureValid("s3cret", Body, Sign("other", Body)));

    [Fact]
    public void Tampered_body_is_rejected()
    {
        var signature = Sign("s3cret", Body);
        Assert.False(LemonSqueezyGateway.SignatureValid("s3cret", Encoding.UTF8.GetBytes("{\"meta\":{}}"), signature));
    }

    private static readonly (string, string)[] Store =
    [
        ("Fast Review", "11"), ("Featured (30 days)", "12"), ("Growth (30 days)", "13"), ("Homepage Spotlight (7 days)", "14"),
        ("Category Sponsorship (7 days)", "15"), ("Competitor Page Sponsorship (7 days)", "16"), ("Sponsored Alternative Card (30 days)", "17"),
    ];

    [Theory]
    [InlineData("fastReview", "11")]
    [InlineData("featured", "12")]
    [InlineData("growth", "13")]
    [InlineData("homepageSpotlight", "14")]
    [InlineData("categorySponsorship", "15")]
    [InlineData("competitorSponsorship", "16")]
    [InlineData("alternativeCard", "17")]
    public void Every_plan_matches_its_store_product(string plan, string variant) =>
        Assert.Equal(variant, LemonSqueezyGateway.MatchVariant(Store, PricingCatalog.ByKey(plan)!));

    [Fact]
    public void A_product_that_only_shares_a_prefix_does_not_match() =>
        Assert.Null(LemonSqueezyGateway.MatchVariant([("Featured Plus", "99")], PricingCatalog.ByKey("featured")!));

    [Theory]
    [InlineData("https://alternivo.lemonsqueezy.com/checkout/custom/abc?signature=x", true)]
    [InlineData("http://alternivo.lemonsqueezy.com/checkout/custom/abc", false)]
    [InlineData("https://lemonsqueezy.com.evil.example/checkout", false)]
    [InlineData("javascript:alert(1)", false)]
    public void Only_lemon_squeezy_https_urls_are_used(string url, bool ok) => Assert.Equal(ok, LemonSqueezyGateway.IsCheckoutUrl(url));
}
