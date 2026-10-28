using Discovery.Api.Infrastructure;
using Discovery.Application.Community;
using Discovery.Infrastructure.Billing;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

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
    [RequireConfirmedEmail]
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
    /// Validates the purchase server-side, creates an order at the catalogue price and returns the Freemius checkout URL
    /// for its plan. Nothing is granted here: the effect is applied only when Freemius's signed webhook arrives.
    /// </summary>
    [HttpPost("checkout")]
    [RequireConfirmedEmail]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<object> Checkout(CheckoutRequest request, [FromServices] FreemiusGateway freemius,
        [FromServices] UserManager<AppUser> users, [FromServices] IConfiguration config, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(current.RequireUserId().ToString())
            ?? throw new Discovery.Application.Common.ForbiddenException("Please sign in again.");
        var site = (config["Site:Url"] ?? "https://alternivo.com").TrimEnd('/');
        var (order, url) = await freemius.StartAsync(user.Id, request.Plan, request.TargetId, user.Email!, $"{site}/maker?canceled=1", ct);
        return new { orderId = order.Id, provider = "freemius", url, amountMinor = order.AmountMinor, currency = order.Currency };
    }

    /// <summary>Order status for the payment page (polls after the iframe finishes).</summary>
    [HttpGet("orders/{id:guid}")]
    public async Task<object> Order(Guid id, [FromServices] Discovery.Application.Abstractions.IAppDbContext db, CancellationToken ct)
    {
        var userId = current.RequireUserId();
        var o = await db.PaymentOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct)
            ?? throw new Discovery.Application.Common.NotFoundException("Order", id.ToString());
        return new { o.Id, o.PlanKey, status = o.Status.ToString(), o.AmountMinor, o.Currency, o.CreatedAt, o.TermsAcceptedAt, o.TermsVersion };
    }

    /// <summary>Checks the product's homepage for the Alternivo badge; a match shortens the free review to 7 days.</summary>
    [HttpPost("submissions/{id:guid}/share/badge")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> ShareBadge(Guid id, [FromServices] Discovery.Infrastructure.Community.ShareProofVerifier verifier, CancellationToken ct)
    {
        await verifier.VerifyBadgeAsync(current.RequireUserId(), id, ct);
        return NoContent();
    }

    /// <summary>Records a link to a public post about Alternivo (checked by a moderator); shortens the free review to 7 days.</summary>
    [HttpPost("submissions/{id:guid}/share/post")]
    [RequireConfirmedEmail]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> SharePost(Guid id, SharePostRequest request, [FromServices] Discovery.Infrastructure.Community.ShareProofVerifier verifier, CancellationToken ct)
    {
        await verifier.SubmitPostAsync(current.RequireUserId(), id, request.Url, ct);
        return NoContent();
    }

    /// <summary>The buyer confirms the pre-contract information and distance sales agreement before the payment form opens.</summary>
    [HttpPost("orders/{id:guid}/accept-terms")]
    public async Task<IActionResult> AcceptTerms(Guid id, AcceptTermsRequest request, [FromServices] MakerService maker, CancellationToken ct)
    {
        await maker.AcceptOrderTermsAsync(current.RequireUserId(), id, request.Version, ct);
        return NoContent();
    }
}

public sealed record CheckoutRequest(string Plan, Guid? TargetId);

public sealed record AcceptTermsRequest(string Version);

public sealed record SharePostRequest(string? Url);

[ApiController]
[Route("api/v1/sponsored")]
[Produces("application/json")]
public sealed class SponsoredController(SponsorService sponsors) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<SponsoredItemDto>> Slot([FromQuery] string slot, CancellationToken ct) => sponsors.ForSlotAsync(slot ?? "", ct);

    [HttpGet("pricing")]
    public async Task<PricingDto> Pricing([FromServices] MakerService maker, [FromServices] IntegrationSettings settings, CancellationToken ct)
    {
        var p = await settings.ActiveAsync(ct);
        return await maker.PricingAsync(p?.Prices, p?.Currency, ct);
    }

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
    /// <summary>Public checkout settings (no secrets): which plans are on sale.</summary>
    [HttpGet("config")]
    public async Task<object> Config(CancellationToken ct)
    {
        var p = await settings.ActiveAsync(ct);
        return new
        {
            enabled = p is not null, provider = p?.Provider, plans = p?.Prices.Keys.ToArray() ?? [], currency = p?.Currency ?? "USD", testMode = p?.TestMode ?? false,
        };
    }

    /// <summary>Freemius webhook (payment.created, payment.refund), forwarded by the web app with its x-signature header.</summary>
    [HttpPost("freemius/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> FreemiusWebhook([FromServices] FreemiusGateway freemius, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await Request.Body.CopyToAsync(buffer, ct);
        if (buffer.Length > 256 * 1024) return StatusCode(StatusCodes.Status413PayloadTooLarge);
        var result = await freemius.HandleWebhookAsync(buffer.ToArray(), Request.Headers["x-signature"].ToString(), ct);
        return result switch
        {
            FreemiusGateway.Result.BadSignature => Unauthorized(),
            FreemiusGateway.Result.NotConfigured => StatusCode(StatusCodes.Status503ServiceUnavailable),
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
