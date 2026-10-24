using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Billing;

public sealed record PayTrBuyer(string Email, string Name, string Ip);

/// <summary>
/// PayTR iFrame API (https://dev.paytr.com/iframe-api). Step 1: get an iframe token server-side for an order.
/// Step 2: PayTR posts the result to the notification URL; only that signed notification marks an order paid.
/// </summary>
public sealed class PayTrGateway(
    AppDbContext db,
    IntegrationSettings settings,
    IHttpClientFactory http,
    MakerService maker,
    TimeProvider clock,
    ILogger<PayTrGateway> logger)
{
    public const string HttpClientName = "paytr";

    public enum Result { Ok, BadHash, NotConfigured, UnknownOrder }

    private static string Hmac(string key, string data) =>
        Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(data)));

    /// <summary>paytr_token = base64(HMAC-SHA256(merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt, merchant_key)).</summary>
    public static string RequestToken(string merchantId, string merchantKey, string merchantSalt, string userIp, string merchantOid, string email,
        int paymentAmount, string userBasket, string noInstallment, string maxInstallment, string currency, string testMode) =>
        Hmac(merchantKey, merchantId + userIp + merchantOid + email + paymentAmount.ToString(CultureInfo.InvariantCulture) + userBasket
            + noInstallment + maxInstallment + currency + testMode + merchantSalt);

    /// <summary>hash = base64(HMAC-SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key)).</summary>
    public static bool NotificationValid(string merchantKey, string merchantSalt, string merchantOid, string status, string totalAmount, string? hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        var expected = Encoding.UTF8.GetBytes(Hmac(merchantKey, merchantOid + merchantSalt + status + totalAmount));
        return CryptographicOperations.FixedTimeEquals(expected, Encoding.UTF8.GetBytes(hash));
    }

    /// <summary>Creates a validated order at the configured price and returns the PayTR iframe token for it.</summary>
    public async Task<(PaymentOrder Order, string Token)> StartAsync(Guid userId, string planKey, Guid? targetId, PayTrBuyer buyer,
        string okUrl, string failUrl, CancellationToken ct)
    {
        var config = await settings.PayTrAsync(ct) ?? throw new ConflictException("Payments are not available yet.");
        var plan = PricingCatalog.ByKey(planKey) ?? throw new BadRequestException("Unknown plan.");
        var amount = config.PriceOf(plan.Key) ?? throw new ConflictException("This plan is not on sale yet.");
        var order = await maker.CreateOrderAsync(userId, plan.Key, targetId, amount, config.Currency, config.TestMode, ct);

        var price = (amount / 100m).ToString("0.00", CultureInfo.InvariantCulture);
        var basket = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new[] { new object[] { $"Alternivo {plan.Name}", price, 1 } })));
        const string noInstallment = "1", maxInstallment = "0";
        var testMode = config.TestMode ? "1" : "0";
        var token = RequestToken(config.MerchantId, config.MerchantKey, config.MerchantSalt, buyer.Ip, order.MerchantOid, buyer.Email,
            amount, basket, noInstallment, maxInstallment, config.Currency, testMode);

        var form = new Dictionary<string, string>
        {
            ["merchant_id"] = config.MerchantId,
            ["user_ip"] = buyer.Ip,
            ["merchant_oid"] = order.MerchantOid,
            ["email"] = buyer.Email,
            ["payment_amount"] = amount.ToString(CultureInfo.InvariantCulture),
            ["paytr_token"] = token,
            ["user_basket"] = basket,
            ["debug_on"] = config.TestMode ? "1" : "0",
            ["no_installment"] = noInstallment,
            ["max_installment"] = maxInstallment,
            ["user_name"] = Truncate(buyer.Name, 60),
            // Digital service: PayTR requires these fields; we do not collect postal data.
            ["user_address"] = "Dijital hizmet - alternivo.com",
            ["user_phone"] = "0000000000",
            ["merchant_ok_url"] = okUrl,
            ["merchant_fail_url"] = failUrl,
            ["timeout_limit"] = "30",
            ["currency"] = config.Currency,
            ["test_mode"] = testMode,
            ["lang"] = "en",
        };

        using var response = await http.CreateClient(HttpClientName).PostAsync("https://www.paytr.com/odeme/api/get-token", new FormUrlEncodedContent(form), ct);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        if (body.TryGetProperty("status", out var status) && status.GetString() == "success" && body.TryGetProperty("token", out var t))
        {
            return (order, t.GetString()!);
        }

        var reason = body.TryGetProperty("reason", out var r) ? r.GetString() : response.StatusCode.ToString();
        logger.LogWarning("PayTR get-token failed for {Order}: {Reason}", order.MerchantOid, reason);
        await MarkFailedAsync(order.Id, $"get-token: {reason}", ct);
        throw new ConflictException("The payment page could not be opened. Please try again later.");
    }

    /// <summary>Handles a PayTR notification. Always idempotent: an already completed order is acknowledged without side effects.</summary>
    public async Task<Result> HandleNotificationAsync(IReadOnlyDictionary<string, string> f, CancellationToken ct)
    {
        var config = await settings.PayTrAsync(ct);
        if (config is null) return Result.NotConfigured;
        var oid = f.GetValueOrDefault("merchant_oid") ?? "";
        var status = f.GetValueOrDefault("status") ?? "";
        var total = f.GetValueOrDefault("total_amount") ?? "";
        if (!NotificationValid(config.MerchantKey, config.MerchantSalt, oid, status, total, f.GetValueOrDefault("hash")))
        {
            logger.LogWarning("PayTR notification with invalid hash for {Order}", oid);
            return Result.BadHash;
        }

        var order = await db.PaymentOrders.FirstOrDefaultAsync(o => o.MerchantOid == oid, ct);
        if (order is null)
        {
            logger.LogWarning("PayTR notification for unknown order {Order}", oid);
            return Result.UnknownOrder;
        }

        if (order.Status != PaymentOrderStatus.Pending)
        {
            // Duplicate notification: re-derive in case an earlier attempt failed half-way, never charge or grant twice.
            if (order.Status == PaymentOrderStatus.Paid) await maker.OnOrderPaidAsync(order.Id, ct);
            return Result.Ok;
        }

        var now = clock.GetUtcNow();
        if (status == "success")
        {
            // total_amount can be higher than the order (installment fees) but never lower.
            var paid = int.TryParse(total, NumberStyles.Integer, CultureInfo.InvariantCulture, out var t) ? t : 0;
            if (paid < order.AmountMinor)
            {
                order.Status = PaymentOrderStatus.Failed;
                order.FailedReason = $"Amount mismatch: paid {paid}, expected {order.AmountMinor}";
                logger.LogError("PayTR amount mismatch for {Order}: {Paid} < {Expected}", oid, paid, order.AmountMinor);
            }
            else
            {
                order.Status = PaymentOrderStatus.Paid;
                order.PaidAmountMinor = paid;
                order.PaymentType = Truncate(f.GetValueOrDefault("payment_type") ?? "", 20);
            }
        }
        else
        {
            order.Status = PaymentOrderStatus.Failed;
            order.FailedReason = Truncate($"{f.GetValueOrDefault("failed_reason_code")} {f.GetValueOrDefault("failed_reason_msg")}".Trim(), 500);
        }

        order.CompletedAt = now;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = order.UserId, Action = $"payment.{order.Status.ToString().ToLowerInvariant()}", EntityType = "PaymentOrder", EntityId = order.Id,
            DataJson = JsonSerializer.Serialize(new { oid, status, total, test = f.GetValueOrDefault("test_mode") }), CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);
        if (order.Status == PaymentOrderStatus.Paid) await maker.OnOrderPaidAsync(order.Id, ct);
        return Result.Ok;
    }

    private async Task MarkFailedAsync(Guid orderId, string reason, CancellationToken ct)
    {
        var order = await db.PaymentOrders.FirstAsync(o => o.Id == orderId, ct);
        order.Status = PaymentOrderStatus.Failed;
        order.FailedReason = Truncate(reason, 500);
        order.CompletedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
