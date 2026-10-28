using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Billing;

/// <summary>
/// Freemius hosted checkout (https://freemius.com/help/documentation/selling-with-freemius/hosted-checkout/). Each plan is a
/// Freemius plan with a one-off price equal to our catalogue price. Freemius does not pass custom data back, so the buyer's
/// e-mail is prefilled read-only and the signed payment.created webhook is matched to the user's latest pending order for
/// that plan. Only the webhook marks an order paid (or refunded).
/// </summary>
public sealed class FreemiusGateway(
    AppDbContext db,
    IntegrationSettings settings,
    MakerService maker,
    TimeProvider clock,
    ILogger<FreemiusGateway> logger)
{
    public enum Result { Ok, BadSignature, NotConfigured, UnknownOrder }

    /// <summary>x-signature = hex(HMAC-SHA256(raw body, product secret key)).</summary>
    public static bool SignatureValid(string secret, byte[] body, string? signature) => LemonSqueezyGateway.SignatureValid(secret, body, signature);

    /// <summary>Sandbox token for the hosted checkout: md5(timestamp + product ID + secret key + public key + "checkout").</summary>
    public static string SandboxToken(string timestamp, string productId, string secretKey, string publicKey) =>
        Convert.ToHexStringLower(MD5.HashData(Encoding.UTF8.GetBytes(timestamp + productId + secretKey + publicKey + "checkout")));

    public static string CheckoutUrl(FreemiusConfig config, string planId, string email, string cancelUrl, DateTimeOffset now)
    {
        var q = new List<string>
        {
            "billing_cycle=lifetime",
            "user_email=" + Uri.EscapeDataString(email),
            "readonly_user=true",
            "hide_coupon=true",
            "cancel_url=" + Uri.EscapeDataString(cancelUrl),
        };
        if (config.TestMode)
        {
            var ts = now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
            q.Add("sandbox=" + SandboxToken(ts, config.ProductId, config.SecretKey, config.PublicKey));
            q.Add("s_ctx_ts=" + ts);
        }

        return $"https://checkout.freemius.com/product/{config.ProductId}/plan/{planId}/?{string.Join('&', q)}";
    }

    public static bool IsCheckoutUrl(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https" && u.Host.Equals("checkout.freemius.com", StringComparison.OrdinalIgnoreCase);

    /// <summary>Creates a validated order at the catalogue price and returns the hosted checkout URL for its plan.</summary>
    public async Task<(PaymentOrder Order, string Url)> StartAsync(Guid userId, string planKey, Guid? targetId, string email, string cancelUrl,
        CancellationToken ct)
    {
        var config = await settings.FreemiusAsync(ct) ?? throw new ConflictException("Payments are not available yet.");
        var plan = PricingCatalog.ByKey(planKey) ?? throw new BadRequestException("Unknown plan.");
        var planId = config.PlanIds.GetValueOrDefault(plan.Key) ?? throw new ConflictException("This plan is not on sale yet.");
        var order = await maker.CreateOrderAsync(userId, plan.Key, targetId, plan.PriceCents, "USD", config.TestMode, ct);
        return (order, CheckoutUrl(config, planId, email, cancelUrl, clock.GetUtcNow()));
    }

    /// <summary>Freemius amounts are decimal dollars ("9.00" or 9, negative on refunds); returns positive cents.</summary>
    public static int Cents(JsonNode? value) =>
        value is null ? 0
        : (int)Math.Round(Math.Abs(decimal.Parse(value.ToString(), NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture)) * 100m);

    /// <summary>Handles a signed webhook (payment.created, payment.refund). Idempotent: a payment is applied to one order once.</summary>
    public async Task<Result> HandleWebhookAsync(byte[] body, string? signature, CancellationToken ct)
    {
        var config = await settings.FreemiusAsync(ct);
        if (config is null) return Result.NotConfigured;
        if (!SignatureValid(config.SecretKey, body, signature))
        {
            logger.LogWarning("Freemius webhook with invalid signature");
            return Result.BadSignature;
        }

        var doc = JsonNode.Parse(body)!;
        var type = doc["type"]?.GetValue<string>() ?? "";
        var payment = doc["objects"]?["payment"];
        if (type is not ("payment.created" or "payment.refund") || payment is null) return Result.Ok;
        var paymentId = payment["id"]?.ToString() ?? "";

        if (type == "payment.refund")
        {
            var original = payment["bound_payment_id"]?.ToString() ?? "";
            var refunded = await db.PaymentOrders.FirstOrDefaultAsync(o => o.ProviderPaymentId == original && o.PaymentType == "freemius", ct);
            if (refunded is null)
            {
                logger.LogWarning("Freemius refund {Payment} for unknown payment {Original}", paymentId, original);
                return Result.UnknownOrder;
            }

            if (refunded.Status == PaymentOrderStatus.Paid)
            {
                var paidAmount = refunded.PaidAmountMinor ?? refunded.AmountMinor;
                await maker.RecordRefundAsync(refunded.UserId, refunded.Id, Math.Min(Cents(payment["gross"]), paidAmount), "Refunded in Freemius", ct);
            }

            return Result.Ok;
        }

        var existing = await db.PaymentOrders.FirstOrDefaultAsync(o => o.ProviderPaymentId == paymentId && o.PaymentType == "freemius", ct);
        if (existing is not null)
        {
            if (existing.Status == PaymentOrderStatus.Paid) await maker.OnOrderPaidAsync(existing.Id, ct);
            return Result.Ok;
        }

        var email = doc["objects"]?["user"]?["email"]?.GetValue<string>() ?? "";
        var planId = payment["plan_id"]?.ToString() ?? "";
        var planKey = config.PlanIds.FirstOrDefault(p => p.Value == planId).Key;
        var normalized = email.ToUpperInvariant();
        var userId = await db.Users.Where(u => u.NormalizedEmail == normalized).Select(u => (Guid?)u.Id).FirstOrDefaultAsync(ct);
        var order = planKey is null || userId is null ? null
            : await db.PaymentOrders
                .Where(o => o.UserId == userId && o.PlanKey == planKey && o.Status == PaymentOrderStatus.Pending && o.ProviderPaymentId == null)
                .OrderByDescending(o => o.CreatedAt).FirstOrDefaultAsync(ct);
        if (order is null)
        {
            logger.LogWarning("Freemius payment {Payment} (plan {Plan}) matches no pending order", paymentId, planId);
            return Result.UnknownOrder;
        }

        var currency = payment["currency"]?.ToString() ?? "usd";
        var paid = currency.Equals(order.Currency, StringComparison.OrdinalIgnoreCase) ? Cents(payment["gross"]) : 0;
        // Freemius does not mark sandbox payments in the payload; the order's own mode is used on both sides.
        var outcome = PayTrGateway.Classify(order.Status, order.TestMode, "success", paid, order.AmountMinor, order.TestMode);
        if (outcome is PayTrGateway.Outcome.Ignore or PayTrGateway.Outcome.AlreadyPaid) return Result.Ok;

        var now = clock.GetUtcNow();
        order.ProviderPaymentId = paymentId;
        order.PaymentType = "freemius";
        if (outcome is PayTrGateway.Outcome.MarkPaid or PayTrGateway.Outcome.LatePaid)
        {
            order.Status = PaymentOrderStatus.Paid;
            order.PaidAmountMinor = paid;
            order.FailedReason = null;
        }
        else
        {
            order.Status = PaymentOrderStatus.Failed;
            order.FailedReason = outcome == PayTrGateway.Outcome.AmountMismatch
                ? $"Amount mismatch: paid {paid} {currency}, expected {order.AmountMinor} {order.Currency} (needs reconciliation)"
                : $"Freemius outcome: {outcome}";
            logger.LogError("Freemius payment {Payment} not applied to {Order}: {Outcome}", paymentId, order.MerchantOid, outcome);
        }

        order.CompletedAt = now;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = order.UserId, Action = $"payment.{order.Status.ToString().ToLowerInvariant()}",
            EntityType = "PaymentOrder", EntityId = order.Id,
            DataJson = JsonSerializer.Serialize(new { provider = "freemius", paymentId, planId, paid, currency }), CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);
        if (order.Status == PaymentOrderStatus.Paid) await maker.OnOrderPaidAsync(order.Id, ct);
        return Result.Ok;
    }
}
