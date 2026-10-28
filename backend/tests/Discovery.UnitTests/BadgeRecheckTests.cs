using Discovery.Application.Community;

namespace Discovery.UnitTests;

public class BadgeRecheckTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Badge_present_and_never_missing_does_nothing() =>
        Assert.Equal(BadgeRecheckAction.None, ShareProof.Recheck(true, null, false, Now));

    [Fact]
    public void First_miss_warns() =>
        Assert.Equal(BadgeRecheckAction.Warn, ShareProof.Recheck(false, null, false, Now));

    [Fact]
    public void Miss_within_grace_waits() =>
        Assert.Equal(BadgeRecheckAction.None, ShareProof.Recheck(false, Now.AddDays(-3), false, Now));

    [Fact]
    public void Miss_after_grace_hides() =>
        Assert.Equal(BadgeRecheckAction.Hide, ShareProof.Recheck(false, Now.AddDays(-ShareProof.BadgeGraceDays), false, Now));

    [Fact]
    public void Already_hidden_and_still_missing_does_nothing() =>
        Assert.Equal(BadgeRecheckAction.None, ShareProof.Recheck(false, Now.AddDays(-20), true, Now));

    [Fact]
    public void Badge_back_during_grace_clears() =>
        Assert.Equal(BadgeRecheckAction.Clear, ShareProof.Recheck(true, Now.AddDays(-2), false, Now));

    [Fact]
    public void Badge_back_on_hidden_listing_restores() =>
        Assert.Equal(BadgeRecheckAction.Restore, ShareProof.Recheck(true, Now.AddDays(-20), true, Now));
}
