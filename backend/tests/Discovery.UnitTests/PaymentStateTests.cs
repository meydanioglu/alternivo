using Discovery.Domain.Operations;
using Discovery.Infrastructure.Billing;
using Xunit;
using O = Discovery.Infrastructure.Billing.PaymentState.Outcome;
using S = Discovery.Domain.Operations.PaymentOrderStatus;

namespace Discovery.UnitTests;

/// <summary>Transitions of a payment order when a correctly signed payment notification arrives.</summary>
public class PaymentStateTests
{
    private static O Classify(S current, string status = "success", int paid = 900, bool orderTest = false, bool notificationTest = false) =>
        PaymentState.Classify(current, orderTest, status, paid, 900, notificationTest);

    [Fact]
    public void Pending_order_with_success_and_full_amount_is_paid() => Assert.Equal(O.MarkPaid, Classify(S.Pending));

    [Fact]
    public void Overpayment_is_accepted() => Assert.Equal(O.MarkPaid, Classify(S.Pending, paid: 950));

    [Fact]
    public void Pending_order_with_failed_status_fails() => Assert.Equal(O.MarkFailed, Classify(S.Pending, "failed"));

    [Fact]
    public void Underpayment_never_grants_the_service() => Assert.Equal(O.AmountMismatch, Classify(S.Pending, paid: 899));

    [Fact]
    public void Test_mode_payment_cannot_pay_a_live_order() => Assert.Equal(O.TestModeMismatch, Classify(S.Pending, notificationTest: true));

    [Fact]
    public void Test_mode_payment_pays_a_test_order() => Assert.Equal(O.MarkPaid, Classify(S.Pending, orderTest: true, notificationTest: true));

    [Theory]
    [InlineData("success")]
    [InlineData("failed")]
    public void Repeated_notification_for_a_paid_order_only_rederives(string status) => Assert.Equal(O.AlreadyPaid, Classify(S.Paid, status));

    [Theory]
    [InlineData(S.Refunded)]
    [InlineData(S.PartiallyRefunded)]
    public void Refunded_orders_never_change(S status)
    {
        Assert.Equal(O.Ignore, Classify(status));
        Assert.Equal(O.Ignore, Classify(status, "failed"));
    }

    [Fact]
    public void Late_success_for_a_failed_order_is_applied_because_money_was_taken() => Assert.Equal(O.LatePaid, Classify(S.Failed));

    [Fact]
    public void Late_underpaid_success_for_a_failed_order_stays_failed() => Assert.Equal(O.Ignore, Classify(S.Failed, paid: 100));

    [Fact]
    public void Failure_notification_for_a_failed_order_is_ignored() => Assert.Equal(O.Ignore, Classify(S.Failed, "failed"));
}
