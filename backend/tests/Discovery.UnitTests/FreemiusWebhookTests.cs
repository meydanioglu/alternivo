using System.Security.Cryptography;
using System.Text;
using Discovery.Infrastructure.Billing;
using Xunit;

namespace Discovery.UnitTests;

public class FreemiusWebhookTests
{
    private const string Secret = "sk_test_secret_key";
    private static readonly byte[] Body = Encoding.UTF8.GetBytes("{\"type\":\"license.created\",\"objects\":{\"license\":{\"id\":\"123\"}}}");

    private static string Sign(string secret, byte[] body) =>
        Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), body)).ToLowerInvariant();

    [Fact]
    public void Accepts_a_valid_signature() => Assert.True(FreemiusWebhook.SignatureValid(Secret, Body, Sign(Secret, Body)));

    [Fact]
    public void Rejects_a_signature_made_with_another_key() =>
        Assert.False(FreemiusWebhook.SignatureValid(Secret, Body, Sign("other_secret_key", Body)));

    [Fact]
    public void Rejects_a_tampered_body()
    {
        var signature = Sign(Secret, Body);
        var tampered = Encoding.UTF8.GetBytes("{\"type\":\"license.created\",\"objects\":{\"license\":{\"id\":\"999\"}}}");
        Assert.False(FreemiusWebhook.SignatureValid(Secret, tampered, signature));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-hex")]
    public void Rejects_missing_or_malformed_signatures(string? signature) =>
        Assert.False(FreemiusWebhook.SignatureValid(Secret, Body, signature));
}
