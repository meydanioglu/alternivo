using System.Security.Cryptography;
using Discovery.Application.Common;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Infrastructure.Billing;

/// <summary>Plans maps PricingCatalog plan keys (fastReview, featured, growth, …) to Freemius plan ids.</summary>
public sealed record FreemiusConfig(string ProductId, string PublicKey, string SecretKey, IReadOnlyDictionary<string, string> Plans)
{
    public string? PlanKeyFor(string? fsPlanId) => fsPlanId is null ? null : Plans.FirstOrDefault(p => p.Value == fsPlanId).Key;
}

public sealed record GoogleConfig(string ClientId, string ClientSecret);

/// <summary>Admin view: secrets are never returned, only whether they are set.</summary>
public sealed record IntegrationSettingsView(
    string? FreemiusProductId,
    string? FreemiusPublicKey,
    bool FreemiusSecretSet,
    IReadOnlyDictionary<string, string> Plans,
    string? GoogleClientId,
    bool GoogleSecretSet);

public sealed record SaveIntegrationSettingsRequest(
    string? FreemiusProductId,
    string? FreemiusPublicKey,
    string? FreemiusSecretKey,
    IReadOnlyDictionary<string, string?>? Plans,
    string? GoogleClientId,
    string? GoogleClientSecret);

/// <summary>
/// Payment (Freemius) and Google sign-in settings stored in AppSettings. Secret values are encrypted with
/// ASP.NET Data Protection and are write-only from the API's point of view.
/// </summary>
public sealed class IntegrationSettings(AppDbContext db, IDataProtectionProvider protection)
{
    private readonly IDataProtector _protector = protection.CreateProtector("Discovery.Settings.v1");

    private static readonly string[] Secrets = ["freemius.secretKey", "google.clientSecret"];

    private async Task<Dictionary<string, string>> LoadAsync(CancellationToken ct)
    {
        var rows = await db.AppSettings.AsNoTracking()
            .Where(s => s.Key.StartsWith("freemius.") || s.Key.StartsWith("google."))
            .ToListAsync(ct);
        var result = new Dictionary<string, string>();
        foreach (var row in rows)
        {
            if (!Secrets.Contains(row.Key))
            {
                result[row.Key] = row.Value;
                continue;
            }

            try
            {
                result[row.Key] = _protector.Unprotect(row.Value);
            }
            catch (CryptographicException)
            {
                // Key ring changed: treat as unset.
            }
        }

        return result;
    }

    public async Task<FreemiusConfig?> FreemiusAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        if (!s.TryGetValue("freemius.productId", out var product) || !s.TryGetValue("freemius.publicKey", out var pub) || !s.TryGetValue("freemius.secretKey", out var secret))
        {
            return null;
        }

        return new FreemiusConfig(product, pub, secret, PlansOf(s));
    }

    public async Task<GoogleConfig?> GoogleAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        return s.TryGetValue("google.clientId", out var id) && s.TryGetValue("google.clientSecret", out var secret) ? new GoogleConfig(id, secret) : null;
    }

    public async Task<IntegrationSettingsView> ViewAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        return new IntegrationSettingsView(
            s.GetValueOrDefault("freemius.productId"), s.GetValueOrDefault("freemius.publicKey"), s.ContainsKey("freemius.secretKey"),
            PlansOf(s),
            s.GetValueOrDefault("google.clientId"), s.ContainsKey("google.clientSecret"));
    }

    /// <summary>null leaves a value unchanged; "" removes it.</summary>
    public async Task SaveAsync(Guid userId, SaveIntegrationSettingsRequest r, CancellationToken ct)
    {
        await SetAsync("freemius.productId", r.FreemiusProductId, false, userId, IsId, ct);
        await SetAsync("freemius.publicKey", r.FreemiusPublicKey, false, userId, IsKey, ct);
        await SetAsync("freemius.secretKey", r.FreemiusSecretKey, true, userId, IsKey, ct);
        foreach (var (key, value) in r.Plans ?? new Dictionary<string, string?>())
        {
            if (PricingCatalog.ByKey(key) is null) throw new BadRequestException($"Unknown plan '{key}'.");
            await SetAsync(PlanPrefix + key, value, false, userId, IsId, ct);
        }
        await SetAsync("google.clientId", r.GoogleClientId, false, userId, v => v.EndsWith(".apps.googleusercontent.com") && v.Length < 200, ct);
        await SetAsync("google.clientSecret", r.GoogleClientSecret, true, userId, IsKey, ct);
        await db.SaveChangesAsync(ct);
    }

    private const string PlanPrefix = "freemius.plan.";

    private static Dictionary<string, string> PlansOf(Dictionary<string, string> s)
    {
        var plans = new Dictionary<string, string>();
        foreach (var plan in PricingCatalog.Plans)
        {
            if (s.TryGetValue(PlanPrefix + plan.Key, out var id)) plans[plan.Key] = id;
        }

        // Earlier setting name for Fast Review.
        if (!plans.ContainsKey("fastReview") && s.TryGetValue(PlanPrefix + "fastTrack", out var legacy)) plans["fastReview"] = legacy;
        return plans;
    }

    private static bool IsId(string v) => v.Length <= 20 && v.All(char.IsDigit);

    private static bool IsKey(string v) => v.Length is >= 8 and <= 200 && !v.Any(char.IsWhiteSpace);

    private async Task SetAsync(string key, string? value, bool secret, Guid userId, Func<string, bool> valid, CancellationToken ct)
    {
        if (value is null) return;
        value = value.Trim();
        var row = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (value.Length == 0)
        {
            if (row is not null) db.AppSettings.Remove(row);
            return;
        }

        if (!valid(value)) throw new BadRequestException($"Invalid value for {key}.");
        var stored = secret ? _protector.Protect(value) : value;
        if (row is null)
        {
            db.AppSettings.Add(new AppSetting { Key = key, Value = stored, UpdatedByUserId = userId, UpdatedAt = DateTimeOffset.UtcNow });
        }
        else
        {
            row.Value = stored;
            row.UpdatedByUserId = userId;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }
}
