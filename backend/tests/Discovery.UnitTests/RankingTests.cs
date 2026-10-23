using Discovery.Application.Ranking;

namespace Discovery.UnitTests;

public class RankingTests
{
    private static readonly Guid F1 = Guid.NewGuid(), F2 = Guid.NewGuid(), F3 = Guid.NewGuid(), F4 = Guid.NewGuid();
    private static readonly Guid Windows = Guid.NewGuid(), Mac = Guid.NewGuid(), Linux = Guid.NewGuid();
    private static readonly Guid Notes = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private static RankingProfile Source => new(
        new HashSet<Guid> { F1, F2, F3, F4 },
        new HashSet<Guid> { Windows, Mac },
        new HashSet<Guid> { Notes });

    private static RankingCandidate Candidate(
        Guid key, IEnumerable<Guid> features, int votes = 0, int editorial = 0, decimal? rating = null, int reviews = 0) =>
        new(key,
            new RankingProfile(features.ToHashSet(), new HashSet<Guid> { Windows, Mac, Linux }, new HashSet<Guid> { Notes }),
            votes, 0, rating, reviews, Now, editorial);

    [Fact]
    public void Empty_candidates_return_empty()
    {
        Assert.Empty(AlternativeRanker.Rank(Source, [], new RankingOptions(), Now));
    }

    [Fact]
    public void More_feature_overlap_ranks_higher_when_other_signals_equal()
    {
        var high = Guid.NewGuid();
        var low = Guid.NewGuid();
        var ranked = AlternativeRanker.Rank(Source,
            [Candidate(low, [F1]), Candidate(high, [F1, F2, F3])],
            new RankingOptions(), Now);

        Assert.Equal(high, ranked[0].Key);
        Assert.Equal(0.75, ranked[0].Signals.Single(s => s.Name == "featureOverlap").Value);
    }

    [Fact]
    public void Community_votes_can_outrank_feature_overlap()
    {
        var popular = Guid.NewGuid();
        var featureRich = Guid.NewGuid();
        var options = new RankingOptions { VotesWeight = 0.8, FeatureOverlapWeight = 0.2, PlatformWeight = 0, CategoryWeight = 0, RatingWeight = 0, FreshnessWeight = 0, EditorialWeight = 0 };
        var ranked = AlternativeRanker.Rank(Source,
            [Candidate(featureRich, [F1, F2, F3, F4], votes: 0), Candidate(popular, [F1], votes: 50)],
            options, Now);

        Assert.Equal(popular, ranked[0].Key);
    }

    [Fact]
    public void Scores_are_normalised_between_0_and_100()
    {
        var ranked = AlternativeRanker.Rank(Source,
            [Candidate(Guid.NewGuid(), [F1, F2, F3, F4], votes: 10, editorial: 100, rating: 5, reviews: 100)],
            new RankingOptions(), Now);

        Assert.InRange(ranked[0].Score, 0, 100);
    }

    [Fact]
    public void Rating_signal_uses_bayesian_prior_for_few_reviews()
    {
        var options = new RankingOptions();
        var oneReview = Candidate(Guid.NewGuid(), [], rating: 5, reviews: 1);
        var manyReviews = Candidate(Guid.NewGuid(), [], rating: 5, reviews: 200);

        Assert.True(AlternativeRanker.RatingSignal(manyReviews, options) > AlternativeRanker.RatingSignal(oneReview, options));
    }

    [Fact]
    public void Freshness_halves_after_half_life()
    {
        Assert.Equal(0.5, AlternativeRanker.Freshness(Now.AddDays(-365), Now, 365), 3);
        Assert.Equal(1.0, AlternativeRanker.Freshness(Now, Now, 365), 3);
    }

    [Fact]
    public void Ordering_is_deterministic_for_ties()
    {
        var a = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var b = Guid.Parse("00000000-0000-0000-0000-000000000002");
        var ranked = AlternativeRanker.Rank(Source, [Candidate(b, [F1]), Candidate(a, [F1])], new RankingOptions(), Now);
        Assert.Equal(a, ranked[0].Key);
    }
}
