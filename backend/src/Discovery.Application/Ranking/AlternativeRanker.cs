using Discovery.Application.Contracts;

namespace Discovery.Application.Ranking;

/// <summary>
/// Weights for the transparent alternatives ranking. Bound from configuration section "Ranking".
/// Sponsored placements are NOT an input: they are rendered separately and labelled.
/// </summary>
public sealed class RankingOptions
{
    public const string SectionName = "Ranking";

    public double VotesWeight { get; set; } = 0.30;
    public double FeatureOverlapWeight { get; set; } = 0.20;
    public double PlatformWeight { get; set; } = 0.10;
    public double CategoryWeight { get; set; } = 0.10;
    public double RatingWeight { get; set; } = 0.15;
    public double FreshnessWeight { get; set; } = 0.05;
    public double EditorialWeight { get; set; } = 0.10;

    /// <summary>Days after which the freshness signal halves.</summary>
    public double FreshnessHalfLifeDays { get; set; } = 365;
    /// <summary>Bayesian prior strength (in "virtual reviews") for the rating signal.</summary>
    public double RatingPriorWeight { get; set; } = 5;
    /// <summary>Prior mean rating used before an app has reviews.</summary>
    public double RatingPriorMean { get; set; } = 3.5;
    /// <summary>Minimum approved alternatives before /software/{slug}/alternatives is indexable.</summary>
    public int MinAlternativesForIndexing { get; set; } = 3;
}

public sealed record RankingProfile(
    IReadOnlySet<Guid> FeatureIds,
    IReadOnlySet<Guid> PlatformIds,
    IReadOnlySet<Guid> CategoryIds);

public sealed record RankingCandidate(
    Guid Key,
    RankingProfile Profile,
    int RelationshipVotes,
    int Likes,
    decimal? RatingAverage,
    int ReviewCount,
    DateTimeOffset FreshnessDate,
    int EditorialScore);

public sealed record RankedCandidate(Guid Key, double Score, IReadOnlyList<RankingSignalDto> Signals);

public static class AlternativeRanker
{
    public static IReadOnlyList<RankedCandidate> Rank(
        RankingProfile source,
        IReadOnlyCollection<RankingCandidate> candidates,
        RankingOptions options,
        DateTimeOffset now)
    {
        if (candidates.Count == 0)
        {
            return [];
        }

        var maxPopularity = candidates.Max(Popularity);
        var totalWeight = options.VotesWeight + options.FeatureOverlapWeight + options.PlatformWeight
            + options.CategoryWeight + options.RatingWeight + options.FreshnessWeight + options.EditorialWeight;
        if (totalWeight <= 0)
        {
            totalWeight = 1;
        }

        return candidates
            .Select(c =>
            {
                var signals = new[]
                {
                    new RankingSignalDto("votes", Round(maxPopularity > 0 ? Math.Log(1 + Popularity(c)) / Math.Log(1 + maxPopularity) : 0), options.VotesWeight),
                    new RankingSignalDto("featureOverlap", Round(Coverage(source.FeatureIds, c.Profile.FeatureIds)), options.FeatureOverlapWeight),
                    new RankingSignalDto("platformCompatibility", Round(Coverage(source.PlatformIds, c.Profile.PlatformIds)), options.PlatformWeight),
                    new RankingSignalDto("categoryRelevance", Round(Coverage(source.CategoryIds, c.Profile.CategoryIds)), options.CategoryWeight),
                    // Without reviews the value is the neutral prior, not a user rating; the name says so (score unchanged).
                    new RankingSignalDto(c.ReviewCount > 0 ? "rating" : "ratingDefault", Round(RatingSignal(c, options)), options.RatingWeight),
                    new RankingSignalDto("freshness", Round(Freshness(c.FreshnessDate, now, options.FreshnessHalfLifeDays)), options.FreshnessWeight),
                    new RankingSignalDto("editorial", Round(Math.Clamp(c.EditorialScore, 0, 100) / 100.0), options.EditorialWeight),
                };
                var score = signals.Sum(s => s.Value * s.Weight) / totalWeight * 100;
                return new RankedCandidate(c.Key, Math.Round(score, 2), signals);
            })
            .OrderByDescending(r => r.Score)
            .ThenBy(r => r.Key)
            .ToList();
    }

    /// <summary>Share of the source's items that the candidate also has (0..1).</summary>
    internal static double Coverage(IReadOnlySet<Guid> source, IReadOnlySet<Guid> candidate)
    {
        if (source.Count == 0)
        {
            return 0;
        }

        var shared = source.Count(candidate.Contains);
        return shared / (double)source.Count;
    }

    internal static double RatingSignal(RankingCandidate c, RankingOptions o)
    {
        var mean = c.RatingAverage is { } avg ? (double)avg : o.RatingPriorMean;
        var bayes = (o.RatingPriorWeight * o.RatingPriorMean + c.ReviewCount * mean) / (o.RatingPriorWeight + c.ReviewCount);
        return Math.Clamp((bayes - 1) / 4.0, 0, 1);
    }

    internal static double Freshness(DateTimeOffset date, DateTimeOffset now, double halfLifeDays)
    {
        var ageDays = Math.Max(0, (now - date).TotalDays);
        return halfLifeDays <= 0 ? 1 : Math.Pow(0.5, ageDays / halfLifeDays);
    }

    private static double Popularity(RankingCandidate c) => c.RelationshipVotes + (c.Likes * 0.25);

    private static double Round(double v) => Math.Round(v, 4);
}
