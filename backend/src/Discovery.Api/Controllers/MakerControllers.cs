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
    /// Validates the purchase server-side, creates an order at the configured price and returns a PayTR iframe token.
    /// Nothing is granted here: the effect is applied only when PayTR's signed payment notification arrives.
    /// </summary>
    [HttpPost("checkout")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<object> Checkout(CheckoutRequest request, [FromServices] PayTrGateway paytr,
        [FromServices] UserManager<AppUser> users, [FromServices] IConfiguration config, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(current.RequireUserId().ToString())
            ?? throw new Discovery.Application.Common.ForbiddenException("Please sign in again.");
        var site = (config["Site:Url"] ?? "https://alternivo.com").TrimEnd('/');
        var (order, token) = await paytr.StartAsync(user.Id, request.Plan, request.TargetId,
            new PayTrBuyer(user.Email!, string.IsNullOrWhiteSpace(user.DisplayName) ? user.Email! : user.DisplayName, ClientIp.Resolve(HttpContext)),
            $"{site}/maker?purchase={request.Plan}", $"{site}/maker?canceled=1", ct);
        return new { orderId = order.Id, token, amountMinor = order.AmountMinor, currency = order.Currency };
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
        var p = await settings.PayTrAsync(ct);
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
        var p = await settings.PayTrAsync(ct);
        return new { enabled = p is not null, plans = p?.Prices.Keys.ToArray() ?? [], currency = p?.Currency ?? "TL", testMode = p?.TestMode ?? false };
    }

    /// <summary>
    /// PayTR payment notification ("Bildirim URL"), forwarded by the web app. Must answer the plain text "OK";
    /// anything else makes PayTR retry. Invalid hashes are rejected.
    /// </summary>
    [HttpPost("paytr/notify")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> PayTrNotify([FromServices] PayTrGateway paytr, CancellationToken ct)
    {
        var form = await Request.ReadFormAsync(ct);
        var fields = form.ToDictionary(x => x.Key, x => x.Value.ToString());
        var result = await paytr.HandleNotificationAsync(fields, ct);
        return result switch
        {
            PayTrGateway.Result.BadHash => BadRequest("PAYTR notification failed: bad hash"),
            PayTrGateway.Result.NotConfigured => StatusCode(StatusCodes.Status503ServiceUnavailable),
            // Unknown orders are logged and acknowledged so PayTR does not retry forever.
            _ => Content("OK", "text/plain"),
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
