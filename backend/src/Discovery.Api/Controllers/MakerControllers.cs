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

    [HttpGet("analytics")]
    public Task<MakerService.AnalyticsDto> Analytics([FromQuery] int? days, [FromQuery] Guid? applicationId, CancellationToken ct) =>
        maker.AnalyticsAsync(current.RequireUserId(), days ?? 30, applicationId, ct);

    [HttpPost("entitlements/{id:guid}/assign")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Assign(Guid id, AssignEntitlementRequest request, CancellationToken ct)
    {
        await maker.AssignAsync(current.RequireUserId(), id, request.TargetId, ct);
        return NoContent();
    }

    [HttpGet("campaigns/availability")]
    public Task<AvailabilityDto> Availability([FromQuery] string plan, [FromQuery] string? target, [FromQuery] DateTimeOffset? startsAt, CancellationToken ct) =>
        maker.AvailabilityAsync(plan, target, startsAt, ct);

    [HttpPost("campaigns")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<object> CreateCampaign(CreateCampaignRequest request, CancellationToken ct) =>
        new { id = await maker.CreateCampaignAsync(current.RequireUserId(), request, ct) };

    [HttpPost("campaigns/{id:guid}/cancel")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> CancelCampaign(Guid id, CancellationToken ct)
    {
        await maker.CancelCampaignAsync(current.RequireUserId(), id, ct);
        return NoContent();
    }

    /// <summary>
    /// Validates the purchase server-side and returns the Freemius checkout URL (locked to the member's e-mail).
    /// Nothing is granted here: the effect is applied only when the signed payment webhook arrives.
    /// </summary>
    [HttpPost("checkout")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Checkout(CheckoutRequest request, [FromServices] IntegrationSettings settings,
        [FromServices] UserManager<AppUser> users, [FromServices] IConfiguration config, CancellationToken ct)
    {
        var fs = await settings.FreemiusAsync(ct);
        if (fs is null || !fs.Plans.TryGetValue(request.Plan, out var planId))
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: "Payments for this plan are not available yet.");
        var user = await users.FindByIdAsync(current.RequireUserId().ToString());
        if (user?.Email is null) return Unauthorized();

        var ticket = await maker.PrepareCheckoutAsync(user.Id, request.Plan, request.TargetId, ct);
        var site = (config["Site:Url"] ?? "https://alternivo.com").TrimEnd('/');
        var query = QueryString.Create(new Dictionary<string, string?>
        {
            ["user_email"] = user.Email,
            ["readonly_user"] = "true",
            ["success_url"] = $"{site}/maker?purchase={ticket.Plan.Key}",
            ["cancel_url"] = $"{site}/maker?canceled=1",
        });
        return Ok(new { url = $"https://checkout.freemius.com/product/{fs.ProductId}/plan/{planId}/{query}", intentId = ticket.IntentId });
    }
}

public sealed record CheckoutRequest(string Plan, Guid? TargetId);

[ApiController]
[Route("api/v1/sponsored")]
[Produces("application/json")]
public sealed class SponsoredController(SponsorService sponsors) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<SponsoredItemDto>> Slot([FromQuery] string slot, CancellationToken ct) => sponsors.ForSlotAsync(slot ?? "", ct);

    [HttpGet("pricing")]
    public Task<PricingDto> Pricing([FromServices] MakerService maker, CancellationToken ct) => maker.PricingAsync(ct);

    [HttpPost("impressions")]
    public async Task<object> Impressions(List<SponsorEventRequest> events, CancellationToken ct) =>
        new { counted = await sponsors.RecordImpressionsAsync(VisitorKey(), events ?? [], ct) };

    [HttpPost("click")]
    public async Task<object> Click(SponsorEventRequest e, CancellationToken ct) =>
        new { url = await sponsors.RecordClickAsync(VisitorKey(), e.ApplicationId, e.Placement, ct) };

    /// <summary>Hashed IP + user agent: enough to de-duplicate without storing who the visitor is.</summary>
    private string VisitorKey()
    {
        var raw = $"{ClientIp.Resolve(HttpContext)}|{Request.Headers.UserAgent}";
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw)))[..24];
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
            plans = fs?.Plans.Keys.ToArray() ?? [],
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
