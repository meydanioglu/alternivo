using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Discovery.Application.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Billing;

/// <summary>
/// Freemius webhook processing. Verifies the x-signature (HMAC-SHA256 of the raw body with the product secret key)
/// and keeps BillingEntitlements in sync from license.* events, as Freemius recommends for SaaS products.
/// </summary>
public sealed class FreemiusWebhook(
    AppDbContext db,
    IntegrationSettings settings,
    UserManager<AppUser> users,
    MakerService maker,
    ILogger<FreemiusWebhook> logger)
{
    private static readonly string[] LicenseEvents =
    [
        "license.created", "license.extended", "license.shortened", "license.updated",
        "license.cancelled", "license.expired", "license.plan.changed",
    ];

    public enum Result { Ok, BadSignature, NotConfigured, Ignored }

    public static bool SignatureValid(string secret, byte[] body, string? signature)
    {
        if (string.IsNullOrWhiteSpace(signature)) return false;
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), body);
        byte[] given;
        try
        {
            given = Convert.FromHexString(signature.Trim());
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expected, given);
    }

    public async Task<Result> HandleAsync(byte[] body, string? signature, CancellationToken ct)
    {
        var config = await settings.FreemiusAsync(ct);
        if (config is null) return Result.NotConfigured;
        if (!SignatureValid(config.SecretKey, body, signature)) return Result.BadSignature;

        var root = JsonNode.Parse(body);
        var type = root?["type"]?.GetValue<string>() ?? "";
        if (type == "license.deleted")
        {
            var licenseId = Str(root?["data"]?["license_id"]) ?? Str(root?["objects"]?["license"]?["id"]);
            if (licenseId is not null)
            {
                var gone = await db.BillingEntitlements.FirstOrDefaultAsync(e => e.FsLicenseId == licenseId, ct);
                if (gone is not null)
                {
                    gone.IsCanceled = true;
                    gone.Expiration = DateTimeOffset.UtcNow;
                    gone.UpdatedAt = DateTimeOffset.UtcNow;
                    await db.SaveChangesAsync(ct);
                    await maker.ReapplyAsync(gone.Id, ct);
                }
            }

            return Result.Ok;
        }

        if (!LicenseEvents.Contains(type)) return Result.Ignored;
        var license = root?["objects"]?["license"];
        var fsUser = root?["objects"]?["user"];
        var id = Str(license?["id"]);
        if (id is null) return Result.Ignored;

        var entitlement = await db.BillingEntitlements.FirstOrDefaultAsync(e => e.FsLicenseId == id, ct);
        if (entitlement is null)
        {
            var email = Str(fsUser?["email"]);
            var member = email is null ? null : await users.FindByEmailAsync(email);
            if (member is null)
            {
                // Purchases must be made with the member's account e-mail (the checkout locks it).
                logger.LogWarning("Freemius license {License} for unknown e-mail {Email}", id, email);
                return Result.Ignored;
            }

            entitlement = new BillingEntitlement { FsLicenseId = id, UserId = member.Id };
            db.BillingEntitlements.Add(entitlement);
        }

        entitlement.FsPlanId = Str(license?["plan_id"]);
        entitlement.FsPricingId = Str(license?["pricing_id"]);
        entitlement.FsUserId = Str(license?["user_id"]) ?? Str(fsUser?["id"]);
        entitlement.Kind = entitlement.FsPlanId switch
        {
            var p when p is not null && p == config.FeaturedPlanId => EntitlementKind.Featured,
            var p when p is not null && p == config.FastTrackPlanId => EntitlementKind.FastTrack,
            var p when p is not null && p == config.LaunchBoostPlanId => EntitlementKind.LaunchBoost,
            _ => EntitlementKind.Unknown,
        };
        entitlement.Expiration = Date(license?["expiration"]);
        entitlement.IsCanceled = license?["is_cancelled"]?.ToString() is "true" or "True" or "1";
        entitlement.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await maker.ReapplyAsync(entitlement.Id, ct);
        return Result.Ok;
    }

    private static string? Str(JsonNode? node) => node is null ? null : node.ToString() is { Length: > 0 } s && s != "null" ? s : null;

    private static DateTimeOffset? Date(JsonNode? node)
    {
        var s = Str(node);
        return s is not null && DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var d) ? d : null;
    }
}
