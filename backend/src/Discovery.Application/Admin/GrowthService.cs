using Discovery.Application.Abstractions;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

public sealed record FunnelStep(string Key, string Label, int Count);

public sealed record PlanFunnelRow(string PlanKey, int Created, int TermsAccepted, int Paid, int Failed, int Abandoned, int Refunded, int RevenueMinor, string Currency);

public sealed record SubmissionSourceRow(Guid SubmissionId, string Name, string Status, DateTimeOffset CreatedAt, string Source, string? LandingPath);

public sealed record GrowthDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<FunnelStep> MakerFunnel,
    IReadOnlyList<PlanFunnelRow> Plans,
    IReadOnlyList<CountRow> FailureReasons,
    IReadOnlyList<CountRow> SubmissionSources,
    IReadOnlyList<SubmissionSourceRow> RecentSubmissions,
    int PricingWithoutCheckout,
    int CheckoutWithoutPayment);

/// <summary>
/// Maker growth analytics: where submitters come from and how far visitors get from pricing to a paid order.
/// Visitors are the daily, cookie-free ids of page views, so a "journey" is the views of one visitor on one day.
/// A submitter's source is the first external referrer or UTM tag seen on a visitor id that the same signed-in
/// user had before submitting.
/// </summary>
public sealed class GrowthService(IAppDbContext db, TimeProvider clock)
{
    private static readonly TimeSpan AbandonAfter = TimeSpan.FromMinutes(30);

    public async Task<GrowthDto> GetAsync(DateOnly fromDate, DateOnly toDate, string? ownHost, CancellationToken ct)
    {
        if (toDate < fromDate) (fromDate, toDate) = (toDate, fromDate);
        var from = new DateTimeOffset(fromDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var until = new DateTimeOffset(toDate.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var now = clock.GetUtcNow();
        var views = db.PageViews.Where(v => v.CreatedAt >= from && v.CreatedAt < until);

        async Task<HashSet<string>> VisitorsOn(Func<IQueryable<PageView>, IQueryable<PageView>> filter) =>
            (await filter(views).Select(v => v.VisitorId).Distinct().ToListAsync(ct)).ToHashSet();

        var pricing = await VisitorsOn(q => q.Where(v => v.Path == "/pricing"));
        var submitPages = await VisitorsOn(q => q.Where(v => v.Path == "/submit" || v.Path == "/submit-ai-tool" || v.Path == "/submit/new"));
        var maker = await VisitorsOn(q => q.Where(v => v.Path == "/maker"));
        var payPage = await VisitorsOn(q => q.Where(v => v.Path.StartsWith("/maker/pay/")));

        var orders = await db.PaymentOrders.AsNoTracking().Where(o => o.CreatedAt >= from && o.CreatedAt < until).ToListAsync(ct);
        bool Abandoned(PaymentOrder o) => o.Status == PaymentOrderStatus.Pending && now - o.CreatedAt > AbandonAfter;
        var submissions = await db.Submissions.AsNoTracking().Where(s => s.CreatedAt >= from && s.CreatedAt < until)
            .OrderByDescending(s => s.CreatedAt).ToListAsync(ct);

        var funnel = new List<FunnelStep>
        {
            new("pricing", "Pricing sayfasını gördü", pricing.Count),
            new("submitPage", "Submit sayfasını gördü", submitPages.Count),
            new("submitted", "Ürün gönderdi", submissions.Count),
            new("maker", "Maker panelini açtı", maker.Count),
            new("checkoutStarted", "Ödeme başlattı (sipariş)", orders.Count),
            new("payPage", "Ödeme sayfasına ulaştı", payPage.Count),
            new("termsAccepted", "Sözleşmeyi onayladı", orders.Count(o => o.TermsAcceptedAt != null)),
            new("paid", "Ödeme tamamlandı", orders.Count(o => o.Status is PaymentOrderStatus.Paid or PaymentOrderStatus.Refunded or PaymentOrderStatus.PartiallyRefunded)),
            new("failed", "Ödeme başarısız", orders.Count(o => o.Status == PaymentOrderStatus.Failed)),
            new("abandoned", "Ödemeyi yarıda bıraktı", orders.Count(Abandoned)),
        };

        var plans = orders.GroupBy(o => o.PlanKey).Select(g => new PlanFunnelRow(
                g.Key, g.Count(), g.Count(o => o.TermsAcceptedAt != null),
                g.Count(o => o.Status == PaymentOrderStatus.Paid), g.Count(o => o.Status == PaymentOrderStatus.Failed), g.Count(Abandoned),
                g.Count(o => o.Status is PaymentOrderStatus.Refunded or PaymentOrderStatus.PartiallyRefunded),
                g.Where(o => o.Status is PaymentOrderStatus.Paid or PaymentOrderStatus.PartiallyRefunded)
                    .Sum(o => (o.PaidAmountMinor ?? o.AmountMinor) - (o.RefundedAmountMinor ?? 0)),
                g.First().Currency))
            .OrderByDescending(r => r.Created).ToList();

        var failures = orders.Where(o => o.Status == PaymentOrderStatus.Failed)
            .GroupBy(o => Reason(o.FailedReason)).Select(g => new CountRow(g.Key, g.Count()))
            .OrderByDescending(r => r.Count).Take(10).ToList();

        var sources = await SourcesAsync(submissions, ownHost, ct);
        var recent = submissions.Take(30).Select(s =>
        {
            var src = sources.GetValueOrDefault(s.Id);
            return new SubmissionSourceRow(s.Id, s.Name, s.Status.ToString(), s.CreatedAt, src?.Label ?? "Bilinmiyor", src?.Landing);
        }).ToList();
        var bySource = submissions.GroupBy(s => sources.GetValueOrDefault(s.Id)?.Label ?? "Bilinmiyor")
            .Select(g => new CountRow(g.Key, g.Count())).OrderByDescending(r => r.Count).ToList();

        // Same-day journeys: a pricing visitor that never reached the payment page, and payment-page visitors without a paid order.
        var pricingWithoutCheckout = pricing.Count(v => !payPage.Contains(v));
        var paidCount = funnel.First(f => f.Key == "paid").Count;
        return new GrowthDto(fromDate, toDate, funnel, plans, failures, bySource, recent, pricingWithoutCheckout,
            Math.Max(0, orders.Count - paidCount));
    }

    private sealed record Attribution(string Label, string? Landing);

    /// <summary>First external touch per submission, via the visitor ids its user had before submitting (up to 30 days back).</summary>
    private async Task<Dictionary<Guid, Attribution>> SourcesAsync(List<Submission> submissions, string? ownHost, CancellationToken ct)
    {
        var result = new Dictionary<Guid, Attribution>();
        if (submissions.Count == 0) return result;
        var userIds = submissions.Select(s => s.SubmittedByUserId).Distinct().ToList();
        var earliest = submissions.Min(s => s.CreatedAt).AddDays(-30);
        var latest = submissions.Max(s => s.CreatedAt);

        var userVisitors = await db.PageViews.AsNoTracking()
            .Where(v => v.UserId != null && userIds.Contains(v.UserId.Value) && v.CreatedAt >= earliest && v.CreatedAt <= latest)
            .Select(v => new { UserId = v.UserId!.Value, v.VisitorId }).Distinct().ToListAsync(ct);
        var visitorIds = userVisitors.Select(x => x.VisitorId).Distinct().ToList();
        var touches = await db.PageViews.AsNoTracking()
            .Where(v => visitorIds.Contains(v.VisitorId) && v.CreatedAt >= earliest && v.CreatedAt <= latest)
            .OrderBy(v => v.CreatedAt)
            .Select(v => new { v.VisitorId, v.Path, v.ReferrerHost, v.UtmSource, v.CreatedAt })
            .ToListAsync(ct);

        foreach (var s in submissions)
        {
            var ids = userVisitors.Where(x => x.UserId == s.SubmittedByUserId).Select(x => x.VisitorId).ToHashSet();
            var journey = touches.Where(t => ids.Contains(t.VisitorId) && t.CreatedAt <= s.CreatedAt).ToList();
            if (journey.Count == 0) continue;
            var first = journey.FirstOrDefault(t => t.UtmSource != null || TrafficSource.Label(t.ReferrerHost, null, ownHost) != "Direct");
            result[s.Id] = first is null
                ? new Attribution("Direct", journey[0].Path)
                : new Attribution(TrafficSource.Label(first.ReferrerHost, first.UtmSource, ownHost), first.Path);
        }

        return result;
    }

    private static string Reason(string? failed)
    {
        if (string.IsNullOrWhiteSpace(failed)) return "Belirtilmemiş";
        if (failed.StartsWith("get-token", StringComparison.Ordinal)) return "Ödeme sayfası açılamadı (get-token)";
        if (failed.StartsWith("Amount mismatch", StringComparison.Ordinal)) return "Tutar uyuşmazlığı";
        return failed.Length > 80 ? failed[..80] : failed;
    }
}
