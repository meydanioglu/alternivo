using Discovery.Domain.Operations;

namespace Discovery.Infrastructure.Billing;

/// <summary>
/// Payment state machine for a signed provider notification. Pending orders complete once; paid orders are only re-derived;
/// refunded orders never change. A success for an order we had marked failed is applied, because the money was taken,
/// unless the amount or the mode does not match.
/// </summary>
public static class PaymentState
{
    public enum Outcome { MarkPaid, LatePaid, MarkFailed, AmountMismatch, TestModeMismatch, AlreadyPaid, Ignore }

    public static Outcome Classify(PaymentOrderStatus current, bool orderTestMode, string status, int paidMinor, int expectedMinor, bool notificationTestMode)
    {
        if (current == PaymentOrderStatus.Paid) return Outcome.AlreadyPaid;
        if (current is PaymentOrderStatus.Refunded or PaymentOrderStatus.PartiallyRefunded) return Outcome.Ignore;
        var pending = current == PaymentOrderStatus.Pending;
        if (status != "success") return pending ? Outcome.MarkFailed : Outcome.Ignore;
        if (notificationTestMode && !orderTestMode) return pending ? Outcome.TestModeMismatch : Outcome.Ignore;
        // The amount paid can be higher than the order but never lower.
        if (paidMinor < expectedMinor) return pending ? Outcome.AmountMismatch : Outcome.Ignore;
        return pending ? Outcome.MarkPaid : Outcome.LatePaid;
    }
}
