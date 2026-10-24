using System.Security.Cryptography;
using System.Text;
using Discovery.Infrastructure.Billing;
using Xunit;

namespace Discovery.UnitTests;

public class PayTrGatewayTests
{
    private const string Key = "testMerchantKey123";
    private const string Salt = "testMerchantSalt456";

    private static string Reference(string data) =>
        Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(Key), Encoding.UTF8.GetBytes(data)));

    [Fact]
    public void Request_token_concatenates_fields_in_documented_order_then_salt()
    {
        var token = PayTrGateway.RequestToken("123456", Key, Salt, "1.2.3.4", "ALTABC", "a@b.com", 500, "W10=", "1", "0", "TL", "1");
        Assert.Equal(Reference("1234561.2.3.4ALTABCa@b.com500W10=10TL1" + Salt), token);
    }

    [Fact]
    public void Valid_notification_is_accepted()
    {
        var hash = Reference("ALTABC" + Salt + "success" + "500");
        Assert.True(PayTrGateway.NotificationValid(Key, Salt, "ALTABC", "success", "500", hash));
    }

    [Theory]
    [InlineData("ALTABC", "success", "1")]      // tampered amount
    [InlineData("ALTABC", "failed", "500")]     // tampered status
    [InlineData("ALTXYZ", "success", "500")]    // other order
    public void Tampered_notification_is_rejected(string oid, string status, string total)
    {
        var hash = Reference("ALTABC" + Salt + "success" + "500");
        Assert.False(PayTrGateway.NotificationValid(Key, Salt, oid, status, total, hash));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-hash")]
    public void Missing_or_garbage_hash_is_rejected(string? hash) =>
        Assert.False(PayTrGateway.NotificationValid(Key, Salt, "ALTABC", "success", "500", hash));

    [Fact]
    public void Wrong_key_is_rejected()
    {
        var hash = Reference("ALTABC" + Salt + "success" + "500");
        Assert.False(PayTrGateway.NotificationValid("otherKey9999", Salt, "ALTABC", "success", "500", hash));
    }
}
