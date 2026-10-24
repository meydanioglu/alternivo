using Discovery.Api.Infrastructure;
using Discovery.Application.Community;
using Discovery.Infrastructure.Billing;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Discovery.Api.Controllers;

public sealed record AssignEntitlementRequest(Guid TargetId);

[ApiController]
[Route("api/v1/maker")]
[Produces("application/json")]
[Authorize]
public sealed class MakerController(MakerService maker, HttpCurrentUser current) : ControllerBase
{
    [HttpGet]
    public Task<MakerDashboardDto> Dashboard(CancellationToken ct) => maker.DashboardAsync(current.RequireUserId(), ct);

    [HttpPost("entitlements/{id:guid}/assign")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Assign(Guid id, AssignEntitlementRequest request, CancellationToken ct)
    {
        await maker.AssignAsync(current.RequireUserId(), id, request.TargetId, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/v1/billing")]
[Produces("application/json")]
public sealed class BillingController(IntegrationSettings settings) : ControllerBase
{
    /// <summary>Public checkout settings (no secrets): which plans exist and the product to check out.</summary>
    [HttpGet("config")]
    public async Task<object> Config(CancellationToken ct)
    {
        var fs = await settings.FreemiusAsync(ct);
        return new
        {
            enabled = fs is not null,
            productId = fs?.ProductId,
            plans = new { featured = fs?.FeaturedPlanId, fastTrack = fs?.FastTrackPlanId, launchBoost = fs?.LaunchBoostPlanId },
        };
    }

    /// <summary>Freemius webhook (forwarded by the web app with the raw body and x-signature header).</summary>
    [HttpPost("freemius/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> FreemiusWebhookCallback([FromServices] FreemiusWebhook webhook, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await Request.Body.CopyToAsync(buffer, ct);
        if (buffer.Length > 512 * 1024) return StatusCode(StatusCodes.Status413PayloadTooLarge);
        var result = await webhook.HandleAsync(buffer.ToArray(), Request.Headers["x-signature"].ToString(), ct);
        return result switch
        {
            FreemiusWebhook.Result.BadSignature => Unauthorized(),
            FreemiusWebhook.Result.NotConfigured => StatusCode(StatusCodes.Status503ServiceUnavailable),
            _ => Ok(),
        };
    }
}

public sealed record GoogleSignInRequest(string Code, string RedirectUri);

[ApiController]
[Route("api/v1/auth/google")]
[Produces("application/json")]
public sealed class GoogleAuthController(GoogleSignIn google, SignInManager<AppUser> signIn) : ControllerBase
{
    [HttpGet("config")]
    public async Task<object> Config(CancellationToken ct)
    {
        var clientId = await google.ClientIdAsync(ct);
        return new { enabled = clientId is not null, clientId };
    }

    /// <summary>Exchanges a Google authorization code for our bearer tokens (same response as /auth/login).</summary>
    [HttpPost]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> SignIn(GoogleSignInRequest request, CancellationToken ct)
    {
        var user = await google.SignInAsync(request.Code, request.RedirectUri, ct);
        signIn.AuthenticationScheme = IdentityConstants.BearerScheme;
        await signIn.SignInAsync(user, isPersistent: false);
        return new EmptyResult(); // the bearer handler has written the token response
    }
}
