using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Discovery.Application.Common;
using Discovery.Infrastructure.Billing;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Discovery.Infrastructure.Identity;

/// <summary>
/// "Sign in with Google" (OpenID Connect authorization-code flow). The web app sends the code it received on its
/// callback; this service exchanges it with Google using the client secret (which never leaves the server), checks
/// the ID token claims and finds or creates the member. The ID token comes straight from Google's token endpoint over
/// TLS, so per OIDC Core §3.1.3.7 its signature does not need separate verification.
/// </summary>
public sealed class GoogleSignIn(IntegrationSettings settings, IHttpClientFactory httpFactory, UserManager<AppUser> users, IConfiguration config)
{
    public const string HttpClientName = "google";
    public const string Provider = "Google";

    public async Task<string?> ClientIdAsync(CancellationToken ct) => (await settings.GoogleAsync(ct))?.ClientId;

    /// <summary>Only our own callback URLs are accepted as redirect targets.</summary>
    public bool IsAllowedRedirect(string redirectUri)
    {
        var site = (config["Site:Url"] ?? "https://alternivo.com").TrimEnd('/');
        return redirectUri == $"{site}/bff/auth/google/callback";
    }

    public async Task<AppUser> SignInAsync(string code, string redirectUri, CancellationToken ct)
    {
        var google = await settings.GoogleAsync(ct) ?? throw new BadRequestException("Google sign-in is not configured.");
        if (!IsAllowedRedirect(redirectUri)) throw new BadRequestException("Invalid redirect URI.");

        using var response = await httpFactory.CreateClient(HttpClientName).PostAsync("https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = google.ClientId,
                ["client_secret"] = google.ClientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
            }), ct);
        var body = await response.Content.ReadFromJsonAsync<JsonObject>(ct);
        if (!response.IsSuccessStatusCode || body?["id_token"]?.GetValue<string>() is not { } idToken)
        {
            throw new BadRequestException("Google sign-in failed. Please try again.");
        }

        var claims = DecodePayload(idToken);
        var iss = claims["iss"]?.GetValue<string>();
        var aud = claims["aud"]?.GetValue<string>();
        var exp = claims["exp"]?.GetValue<long>() ?? 0;
        var sub = claims["sub"]?.GetValue<string>();
        var email = claims["email"]?.GetValue<string>();
        var verified = claims["email_verified"]?.ToString() is "true" or "True";
        if (iss is not ("https://accounts.google.com" or "accounts.google.com") || aud != google.ClientId
            || DateTimeOffset.FromUnixTimeSeconds(exp) < DateTimeOffset.UtcNow || sub is null || email is null || !verified)
        {
            throw new BadRequestException("Google account could not be verified.");
        }

        var user = await users.FindByLoginAsync(Provider, sub) ?? await users.FindByEmailAsync(email);
        if (user is null)
        {
            var name = claims["name"]?.GetValue<string>();
            user = new AppUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = string.IsNullOrWhiteSpace(name) ? email.Split('@')[0] : name.Length > 60 ? name[..60] : name,
            };
            var created = await users.CreateAsync(user);
            if (!created.Succeeded) throw new BadRequestException(string.Join("; ", created.Errors.Select(e => e.Description)));
            await users.AddToRoleAsync(user, Roles.Member);
        }
        else if (!user.EmailConfirmed)
        {
            // Google has verified this address, so the matching account is confirmed too.
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }

        if ((await users.GetLoginsAsync(user)).All(l => l.LoginProvider != Provider))
        {
            await users.AddLoginAsync(user, new UserLoginInfo(Provider, sub, Provider));
        }

        if (await users.IsLockedOutAsync(user)) throw new ForbiddenException("This account is blocked.");
        return user;
    }

    private static JsonObject DecodePayload(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length != 3) throw new BadRequestException("Invalid Google token.");
        var payload = parts[1].Replace('-', '+').Replace('_', '/');
        payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        return JsonNode.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(payload)))?.AsObject()
            ?? throw new BadRequestException("Invalid Google token.");
    }
}
