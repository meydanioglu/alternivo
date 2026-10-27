using System.Globalization;
using System.Net.Http.Headers;
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
/// Lemon Squeezy hosted checkout (https://docs.lemonsqueezy.com/api/checkouts). Step 1: create a checkout for an order
/// at our own price and send the buyer to its URL. Step 2: Lemon Squeezy posts a signed webhook; only that marks the
/// order paid (or refunded). Products in the store are matched to plans by name ("Featured (30 days)" → Featured).
/// </summary>
public sealed class LemonSqueezyGateway(
    AppDbContext db,
    IntegrationSettings settings,
    IHttpClientFactory http,
    MakerService maker,
    TimeProvider clock,
    ILogger<LemonSqueezyGateway> logger)
{
    public const string HttpClientName = "lemonsqueezy";
    private const string Api = "https://api.lemonsqueezy.com/v1";

    public enum Result { Ok, BadSignature, NotConfigured, UnknownOrder }

    /// <summary>X-Signature = hex(HMAC-SHA256(raw body, signing secret)).</summary>
    public static bool SignatureValid(string secret, byte[] body, string? signature)
    {
        if (string.IsNullOrEmpty(signature)) return false;
        var expected = Encoding.ASCII.GetBytes(Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), body)));
        return CryptographicOperations.FixedTimeEquals(expected, Encoding.ASCII.GetBytes(signature.Trim().ToLowerInvariant()));
    }

    /// <summary>The store product for a plan: its name is the plan name, optionally followed by a suffix such as " (30 days)".</summary>
    public static string? MatchVariant(IEnumerable<(string ProductName, string VariantId)> variants, PlanDefinition plan) =>
        variants.Where(v => v.ProductName.Equals(plan.Name, StringComparison.OrdinalIgnoreCase)
                || v.ProductName.StartsWith(plan.Name + " (", StringComparison.OrdinalIgnoreCase))
            .Select(v => v.VariantId).FirstOrDefault();

    private HttpClient Client(LemonConfig config)
    {
        var client = http.CreateClient(HttpClientName);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.api+json"));
        return client;
    }

    private async Task<string> VariantForAsync(HttpClient client, LemonConfig config, PlanDefinition plan, CancellationToken ct)
    {
        var url = $"{Api}/products?filter[store_id]={config.StoreId}&include=variants&page[size]=50";
        using var response = await client.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Lemon Squeezy products request failed: {Status}", response.StatusCode);
            throw new ConflictException("The payment page could not be opened. Please try again later.");
        }

        var doc = JsonNode.Parse(await response.Content.ReadAsStringAsync(ct))!;
        var names = (doc["data"]?.AsArray() ?? [])
            .ToDictionary(p => p!["id"]!.GetValue<string>(), p => p!["attributes"]?["name"]?.GetValue<string>() ?? "");
        var variants = (doc["included"]?.AsArray() ?? [])
            .Where(v => v?["type"]?.GetValue<string>() == "variants")
            .Select(v => (ProductId: v!["attributes"]?["product_id"]?.ToString() ?? "", VariantId: v["id"]!.GetValue<string>()))
            .Where(v => names.ContainsKey(v.ProductId))
            .Select(v => (names[v.ProductId], v.VariantId));
        return MatchVariant(variants, plan)
            ?? throw new ConflictException("This plan is not on sale yet.");
    }

    /// <summary>Creates a validated order at the configured price and returns the hosted checkout URL for it.</summary>
    public async Task<(PaymentOrder Order, string Url)> StartAsync(Guid userId, string planKey, Guid? targetId, string email, string name,
        string redirectUrl, CancellationToken ct)
    {
        var config = await settings.LemonAsync(ct) ?? throw new ConflictException("Payments are not available yet.");
        var plan = PricingCatalog.ByKey(planKey) ?? throw new BadRequestException("Unknown plan.");
        var amount = config.PriceOf(plan.Key) ?? throw new ConflictException("This plan is not on sale yet.");
        var client = Client(config);
        var variantId = await VariantForAsync(client, config, plan, ct);
        var order = await maker.CreateOrderAsync(userId, plan.Key, targetId, amount, config.Currency, config.TestMode, ct);

        var payload = new JsonObject
        {
            ["data"] = new JsonObject
            {
                ["type"] = "checkouts",
                ["attributes"] = new JsonObject
                {
                    // Our price is the source of truth; the store product only names the purchase.
                    ["custom_price"] = amount,
                    ["test_mode"] = config.TestMode,
                    ["product_options"] = new JsonObject
                    {
                        ["redirect_url"] = redirectUrl,
                        ["enabled_variants"] = new JsonArray(int.Parse(variantId, CultureInfo.InvariantCulture)),
                    },
                    ["checkout_options"] = new JsonObject { ["discount"] = false },
                    ["checkout_data"] = new JsonObject
                    {
                        ["email"] = email,
                        ["name"] = name.Length <= 60 ? name : name[..60],
                        ["custom"] = new JsonObject { ["order_id"] = order.MerchantOid },
                    },
                    ["expires_at"] = clock.GetUtcNow().AddMinutes(60).ToString("O", CultureInfo.InvariantCulture),
                },
                ["relationships"] = new JsonObject
                {
                    ["store"] = new JsonObject { ["data"] = new JsonObject { ["type"] = "stores", ["id"] = config.StoreId } },
                    ["variant"] = new JsonObject { ["data"] = new JsonObject { ["type"] = "variants", ["id"] = variantId } },
                },
            },
        };

        var content = new StringContent(payload.ToJsonString(), Encoding.UTF8);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/vnd.api+json");
        using var response = await client.PostAsync($"{Api}/checkouts", content, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        var checkoutUrl = response.IsSuccessStatusCode ? JsonNode.Parse(body)?["data"]?["attributes"]?["url"]?.GetValue<string>() : null;
        if (checkoutUrl is not null && IsCheckoutUrl(checkoutUrl)) return (order, checkoutUrl);

        logger.LogWarning("Lemon Squeezy checkout failed for {Order}: {Status} {Body}", order.MerchantOid, response.StatusCode,
            body.Length <= 500 ? body : body[..500]);
        await MarkFailedAsync(order.Id, $"checkout: {(int)response.StatusCode}", ct);
        throw new ConflictException("The payment page could not be opened. Please try again later.");
    }

    public static bool IsCheckoutUrl(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https"
        && (u.Host.EndsWith(".lemonsqueezy.com", StringComparison.OrdinalIgnoreCase) || u.Host.Equals("lemonsqueezy.com", StringComparison.OrdinalIgnoreCase));

    /// <summary>Handles a signed webhook (order_created, order_refunded). Idempotent like the PayTR notification.</summary>
    public async Task<Result> HandleWebhookAsync(byte[] body, string? signature, CancellationToken ct)
    {
        var config = await settings.LemonAsync(ct);
        if (config is null) return Result.NotConfigured;
        if (!SignatureValid(config.WebhookSecret, body, signature))
        {
            logger.LogWarning("Lemon Squeezy webhook with invalid signature");
            return Result.BadSignature;
        }

        var doc = JsonNode.Parse(body)!;
        var eventName = doc["meta"]?["event_name"]?.GetValue<string>() ?? "";
        var oid = doc["meta"]?["custom_data"]?["order_id"]?.ToString() ?? "";
        var a = doc["data"]?["attributes"];
        if (eventName is not ("order_created" or "order_refunded") || a is null) return Result.Ok;

        var order = await db.PaymentOrders.FirstOrDefaultAsync(o => o.MerchantOid == oid, ct);
        if (order is null)
        {
            logger.LogWarning("Lemon Squeezy {Event} for unknown order {Order}", eventName, oid);
            return Result.UnknownOrder;
        }

        var status = a["status"]?.GetValue<string>() ?? "";
        // With tax-inclusive pricing the price we sent is the total; otherwise tax is added on top of the subtotal.
        var subtotal = a["tax_inclusive"]?.GetValue<bool>() == true ? a["total"]?.GetValue<int>() ?? 0 : a["subtotal"]?.GetValue<int>() ?? 0;
        var testMode = a["test_mode"]?.GetValue<bool>() ?? doc["meta"]?["test_mode"]?.GetValue<bool>() ?? false;
        var currency = a["currency"]?.GetValue<string>() ?? "";
        var providerId = doc["data"]?["id"]?.ToString() ?? "";

        if (eventName == "order_refunded" || status is "refunded" or "partial_refund")
        {
            var refunded = a["refunded_amount"]?.GetValue<int>() ?? 0;
            if (order.Status == PaymentOrderStatus.Paid && refunded > 0)
            {
                var paidSubtotal = order.PaidAmountMinor ?? order.AmountMinor;
                // Lemon reports refunds against the total (tax included); cap at what we recorded as paid.
                await maker.RecordRefundAsync(order.UserId, order.Id, Math.Min(refunded, paidSubtotal), "Refunded in Lemon Squeezy", ct);
            }

            return Result.Ok;
        }

        // Prices are compared before tax and in the order's currency; a different currency is never accepted as paid.
        var paid = currency.Equals(order.Currency, StringComparison.OrdinalIgnoreCase) ? subtotal : 0;
        var outcome = PayTrGateway.Classify(order.Status, order.TestMode, status == "paid" ? "success" : status, paid, order.AmountMinor, testMode);
        var now = clock.GetUtcNow();
        switch (outcome)
        {
            case PayTrGateway.Outcome.AlreadyPaid:
                await maker.OnOrderPaidAsync(order.Id, ct);
                return Result.Ok;
            case PayTrGateway.Outcome.Ignore:
                return Result.Ok;
            case PayTrGateway.Outcome.MarkPaid or PayTrGateway.Outcome.LatePaid:
                order.Status = PaymentOrderStatus.Paid;
                order.PaidAmountMinor = paid;
                order.PaymentType = "lemonsqueezy";
                order.FailedReason = null;
                break;
            case PayTrGateway.Outcome.AmountMismatch:
                order.Status = PaymentOrderStatus.Failed;
                order.FailedReason = $"Amount mismatch: paid {subtotal} {currency}, expected {order.AmountMinor} {order.Currency} (needs reconciliation)";
                logger.LogError("Lemon Squeezy amount mismatch for {Order}", oid);
                break;
            case PayTrGateway.Outcome.TestModeMismatch:
                order.Status = PaymentOrderStatus.Failed;
                order.FailedReason = "Test-mode payment for a live order";
                logger.LogError("Lemon Squeezy test-mode order for live order {Order}", oid);
                break;
            default:
                order.Status = PaymentOrderStatus.Failed;
                order.FailedReason = $"Lemon Squeezy status: {status}";
                break;
        }

        order.CompletedAt = now;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = order.UserId, Action = $"payment.{(outcome == PayTrGateway.Outcome.LatePaid ? "late-paid" : order.Status.ToString().ToLowerInvariant())}",
            EntityType = "PaymentOrder", EntityId = order.Id,
            DataJson = JsonSerializer.Serialize(new { provider = "lemonsqueezy", providerId, oid, status, subtotal, currency, test = testMode }), CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);
        if (order.Status == PaymentOrderStatus.Paid) await maker.OnOrderPaidAsync(order.Id, ct);
        return Result.Ok;
    }

    private async Task MarkFailedAsync(Guid orderId, string reason, CancellationToken ct)
    {
        var order = await db.PaymentOrders.FirstAsync(o => o.Id == orderId, ct);
        order.Status = PaymentOrderStatus.Failed;
        order.FailedReason = reason;
        order.CompletedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }
}
