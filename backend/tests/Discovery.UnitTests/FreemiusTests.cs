using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Discovery.Infrastructure.Billing;

namespace Discovery.UnitTests;

public class FreemiusTests
{
    private static FreemiusConfig Config(bool test) =>
        new("42747", "pk_public", "sk_secret", test, FreemiusConfig.DefaultPlanIds);

    [Fact]
    public void Signature_is_hex_hmac_sha256_of_the_body()
    {
        var body = Encoding.UTF8.GetBytes("{\"type\":\"payment.created\"}");
        var sig = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes("sk_secret"), body));
        Assert.True(FreemiusGateway.SignatureValid("sk_secret", body, sig));
        Assert.False(FreemiusGateway.SignatureValid("sk_other", body, sig));
        Assert.False(FreemiusGateway.SignatureValid("sk_secret", body, null));
    }

    [Fact]
    public void Live_checkout_url_prefills_a_readonly_email_for_the_plan()
    {
        var url = FreemiusGateway.CheckoutUrl(Config(false), "75017", "a+b@example.com", "https://alternivo.com/maker?canceled=1", DateTimeOffset.UnixEpoch);
        Assert.StartsWith("https://checkout.freemius.com/product/42747/plan/75017/?", url);
        Assert.Contains("user_email=a%2Bb%40example.com", url);
        Assert.Contains("readonly_user=true", url);
        Assert.DoesNotContain("sandbox=", url);
        Assert.True(FreemiusGateway.IsCheckoutUrl(url));
    }

    [Fact]
    public void Test_mode_adds_a_sandbox_token()
    {
        var url = FreemiusGateway.CheckoutUrl(Config(true), "75016", "a@example.com", "https://alternivo.com", DateTimeOffset.FromUnixTimeSeconds(1700000000));
        var token = FreemiusGateway.SandboxToken("1700000000", "42747", "sk_secret", "pk_public");
        Assert.Contains($"sandbox={token}&s_ctx_ts=1700000000", url);
        Assert.Equal(32, token.Length);
    }

    [Theory]
    [InlineData("9", 900)]
    [InlineData("\"9.00\"", 900)]
    [InlineData("-19.5", 1950)]
    public void Amounts_are_converted_to_positive_cents(string json, int cents) =>
        Assert.Equal(cents, FreemiusGateway.Cents(JsonNode.Parse(json)));

    [Fact]
    public void Every_catalogue_plan_has_a_freemius_plan() =>
        Assert.All(Discovery.Domain.Operations.PricingCatalog.Plans, p => Assert.True(FreemiusConfig.DefaultPlanIds.ContainsKey(p.Key), p.Key));
}
