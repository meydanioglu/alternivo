using System.Security.Cryptography;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Discovery.Infrastructure.Content;

public sealed record AiSettingsView(bool Configured, string? Source, string? KeyHint, string Model, DateTimeOffset? UpdatedAt);

/// <summary>
/// OpenAI settings editable from the admin panel. The API key is encrypted with ASP.NET Data Protection (keys live
/// in the API's persisted key ring, not in the database), is never returned to any client, and only its last four
/// characters are shown. A key in the panel overrides OPENAI_API_KEY from the environment.
/// </summary>
public sealed class AiSettings(AppDbContext db, IDataProtectionProvider protection, IConfiguration config)
{
    public const string KeyName = "openai.apiKey";
    public const string ModelName = "openai.model";
    public const string DefaultModel = "gpt-5";

    private readonly IDataProtector _protector = protection.CreateProtector("Discovery.Settings.v1");

    public async Task<string?> GetApiKeyAsync(CancellationToken ct)
    {
        var stored = await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == KeyName, ct);
        if (stored is not null)
        {
            try
            {
                return _protector.Unprotect(stored.Value);
            }
            catch (CryptographicException)
            {
                // Key ring changed: treat as not configured rather than failing every request.
            }
        }

        return string.IsNullOrWhiteSpace(config["OpenAI:ApiKey"]) ? null : config["OpenAI:ApiKey"];
    }

    public async Task<string> GetModelAsync(CancellationToken ct)
    {
        var stored = await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == ModelName, ct);
        if (!string.IsNullOrWhiteSpace(stored?.Value)) return stored.Value;
        return string.IsNullOrWhiteSpace(config["OpenAI:Model"]) ? DefaultModel : config["OpenAI:Model"]!;
    }

    public async Task<AiSettingsView> ViewAsync(CancellationToken ct)
    {
        var stored = await db.AppSettings.AsNoTracking().Where(s => s.Key == KeyName || s.Key == ModelName).ToListAsync(ct);
        var keyRow = stored.FirstOrDefault(s => s.Key == KeyName);
        var key = await GetApiKeyAsync(ct);
        var source = key is null ? null : keyRow is not null ? "panel" : "env";
        var hint = key is { Length: > 8 } ? $"…{key[^4..]}" : key is null ? null : "…";
        return new AiSettingsView(key is not null, source, hint, await GetModelAsync(ct), stored.Max(s => (DateTimeOffset?)s.UpdatedAt));
    }

    /// <summary>apiKey: null keeps the current key, "" removes the panel key. model: null keeps, "" resets to default.</summary>
    public async Task SaveAsync(Guid userId, string? apiKey, string? model, CancellationToken ct)
    {
        if (apiKey is not null)
        {
            apiKey = apiKey.Trim();
            if (apiKey.Length == 0)
            {
                await db.AppSettings.Where(s => s.Key == KeyName).ExecuteDeleteAsync(ct);
            }
            else
            {
                if (apiKey.Length is < 20 or > 300 || apiKey.Any(char.IsWhiteSpace))
                {
                    throw new Application.Common.BadRequestException("This does not look like an OpenAI API key.");
                }

                await UpsertAsync(KeyName, _protector.Protect(apiKey), userId, ct);
            }
        }

        if (model is not null)
        {
            model = model.Trim();
            if (model.Length == 0)
            {
                await db.AppSettings.Where(s => s.Key == ModelName).ExecuteDeleteAsync(ct);
            }
            else
            {
                if (model.Length > 60 || !model.All(c => char.IsLetterOrDigit(c) || c is '-' or '.' or '_' or ':'))
                {
                    throw new Application.Common.BadRequestException("Invalid model name.");
                }

                await UpsertAsync(ModelName, model, userId, ct);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task UpsertAsync(string key, string value, Guid userId, CancellationToken ct)
    {
        var row = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (row is null)
        {
            db.AppSettings.Add(new AppSetting { Key = key, Value = value, UpdatedByUserId = userId, UpdatedAt = DateTimeOffset.UtcNow });
        }
        else
        {
            row.Value = value;
            row.UpdatedByUserId = userId;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }
}
