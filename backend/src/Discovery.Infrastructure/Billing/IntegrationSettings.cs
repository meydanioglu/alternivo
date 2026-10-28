using System.Globalization;
using System.Security.Cryptography;
using Discovery.Application.Common;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Infrastructure.Billing;

/// <summary>
/// Freemius product credentials. Each catalogue plan is a Freemius plan (plan key → Freemius plan ID) with a one-off
/// price equal to the catalogue price, so the pricing page and the checkout always agree.
/// </summary>
public sealed record FreemiusConfig(string ProductId, string PublicKey, string SecretKey, bool TestMode, IReadOnlyDictionary<string, string> PlanIds)
{
    /// <summary>The plans created in the Alternivo product (42747) of the Freemius dashboard.</summary>
    public static readonly IReadOnlyDictionary<string, string> DefaultPlanIds = new Dictionary<string, string>
    {
        ["fastReview"] = "75016",
        ["featured"] = "75017",
        ["growth"] = "75018",
        ["homepageSpotlight"] = "75019",
        ["categorySponsorship"] = "75020",
        ["competitorSponsorship"] = "75021",
        ["alternativeCard"] = "75022",
    };
}

/// <summary>The payment provider used for new checkouts, with the plans on sale and their currency.</summary>
public sealed record ActivePayments(string Provider, IReadOnlyDictionary<string, int> Prices, string Currency, bool TestMode);

public sealed record GoogleConfig(string ClientId, string ClientSecret);

/// <summary>Admin view: secrets are never returned, only whether they are set.</summary>
public sealed record IntegrationSettingsView(
    string? GoogleClientId,
    bool GoogleSecretSet,
    string? SmtpHost,
    int? SmtpPort,
    string? SmtpUsername,
    bool SmtpPasswordSet,
    string? SmtpFrom,
    string? FreemiusProductId,
    string? FreemiusPublicKey,
    bool FreemiusSecretKeySet,
    bool FreemiusTestMode);

public sealed record SaveIntegrationSettingsRequest(
    string? GoogleClientId = null,
    string? GoogleClientSecret = null,
    string? SmtpHost = null,
    string? SmtpPort = null,
    string? SmtpUsername = null,
    string? SmtpPassword = null,
    string? SmtpFrom = null,
    string? FreemiusProductId = null,
    string? FreemiusPublicKey = null,
    string? FreemiusSecretKey = null,
    bool? FreemiusTestMode = null);

/// <summary>
/// Payment (Freemius), SMTP and Google sign-in settings stored in AppSettings. Secret values are encrypted with
/// ASP.NET Data Protection and are write-only from the API's point of view.
/// </summary>
public sealed class IntegrationSettings(AppDbContext db, IDataProtectionProvider protection)
{
    private readonly IDataProtector _protector = protection.CreateProtector("Discovery.Settings.v1");

    private static readonly string[] Secrets = ["google.clientSecret", "smtp.password", "freemius.secretKey"];

    private async Task<Dictionary<string, string>> LoadAsync(CancellationToken ct)
    {
        var rows = await db.AppSettings.AsNoTracking()
            .Where(s => s.Key.StartsWith("google.") || s.Key.StartsWith("smtp.") || s.Key.StartsWith("freemius."))
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

    public async Task<FreemiusConfig?> FreemiusAsync(CancellationToken ct) => FreemiusOf(await LoadAsync(ct));

    private static FreemiusConfig? FreemiusOf(Dictionary<string, string> s) =>
        s.TryGetValue("freemius.productId", out var id) && s.TryGetValue("freemius.publicKey", out var pk) && s.TryGetValue("freemius.secretKey", out var sk)
            ? new FreemiusConfig(id, pk, sk, s.GetValueOrDefault("freemius.testMode") == "1", FreemiusConfig.DefaultPlanIds)
            : null;

    /// <summary>Freemius when configured, with the plans on sale at their catalogue prices; null when nothing is on sale.</summary>
    public async Task<ActivePayments?> ActiveAsync(CancellationToken ct) =>
        FreemiusOf(await LoadAsync(ct)) is { } f
            ? new ActivePayments("freemius", PricingCatalog.Plans.Where(p => f.PlanIds.ContainsKey(p.Key)).ToDictionary(p => p.Key, p => p.PriceCents), "USD", f.TestMode)
            : null;

    /// <summary>SMTP settings entered in admin; null until host, username and password are all set.</summary>
    public async Task<Identity.SmtpOptions?> SmtpAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        if (!s.TryGetValue("smtp.host", out var host) || !s.TryGetValue("smtp.username", out var user) || !s.TryGetValue("smtp.password", out var password))
        {
            return null;
        }

        return new Identity.SmtpOptions
        {
            Host = host, Username = user, Password = password,
            Port = int.TryParse(s.GetValueOrDefault("smtp.port"), CultureInfo.InvariantCulture, out var port) ? port : 587,
            From = s.GetValueOrDefault("smtp.from") ?? "no-reply@alternivo.com",
        };
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
            s.GetValueOrDefault("google.clientId"), s.ContainsKey("google.clientSecret"),
            s.GetValueOrDefault("smtp.host"), int.TryParse(s.GetValueOrDefault("smtp.port"), CultureInfo.InvariantCulture, out var port) ? port : null,
            s.GetValueOrDefault("smtp.username"), s.ContainsKey("smtp.password"), s.GetValueOrDefault("smtp.from"),
            s.GetValueOrDefault("freemius.productId"), s.GetValueOrDefault("freemius.publicKey"), s.ContainsKey("freemius.secretKey"),
            s.GetValueOrDefault("freemius.testMode") == "1");
    }

    /// <summary>null leaves a value unchanged; "" removes it.</summary>
    public async Task SaveAsync(Guid userId, SaveIntegrationSettingsRequest r, CancellationToken ct)
    {
        await SetAsync("google.clientId", r.GoogleClientId, false, userId, v => v.EndsWith(".apps.googleusercontent.com") && v.Length < 200, ct);
        await SetAsync("google.clientSecret", r.GoogleClientSecret, true, userId, IsKey, ct);

        await SetAsync("freemius.productId", r.FreemiusProductId?.Trim(), false, userId, v => v.Length <= 20 && v.All(char.IsDigit), ct);
        await SetAsync("freemius.publicKey", r.FreemiusPublicKey?.Trim(), false, userId, v => v.StartsWith("pk_") && v.Length <= 100 && !v.Any(char.IsWhiteSpace), ct);
        await SetAsync("freemius.secretKey", r.FreemiusSecretKey?.Trim(), true, userId, v => v.StartsWith("sk_") && v.Length <= 100 && !v.Any(char.IsWhiteSpace), ct);
        if (r.FreemiusTestMode is { } freemiusTest) await SetAsync("freemius.testMode", freemiusTest ? "1" : "0", false, userId, _ => true, ct);

        await SetAsync("smtp.host", r.SmtpHost, false, userId, v => v.Length <= 200 && Uri.CheckHostName(v) != UriHostNameType.Unknown, ct);
        await SetAsync("smtp.port", r.SmtpPort, false, userId, v => int.TryParse(v, CultureInfo.InvariantCulture, out var n) && n is > 0 and < 65536, ct);
        await SetAsync("smtp.username", r.SmtpUsername, false, userId, v => v.Length <= 200 && !v.Any(char.IsWhiteSpace), ct);
        await SetAsync("smtp.password", r.SmtpPassword, true, userId, v => v.Length is >= 8 and <= 500 && !v.Any(char.IsWhiteSpace), ct);
        await SetAsync("smtp.from", r.SmtpFrom, false, userId, v => v.Length <= 200 && System.Net.Mail.MailAddress.TryCreate(v, out _), ct);

        await db.SaveChangesAsync(ct);
    }

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
