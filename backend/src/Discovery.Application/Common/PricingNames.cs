using Discovery.Domain;

namespace Discovery.Application.Common;

/// <summary>Maps PricingModel flags to/from the public kebab-case names used in URLs and JSON.</summary>
public static class PricingNames
{
    private static readonly (PricingModel Flag, string Name)[] Map =
    [
        (PricingModel.Free, "free"),
        (PricingModel.Freemium, "freemium"),
        (PricingModel.Paid, "paid"),
        (PricingModel.FreeTrial, "free-trial"),
        (PricingModel.OneTimePurchase, "one-time-purchase"),
        (PricingModel.Subscription, "subscription"),
    ];

    public static IReadOnlyList<string> All { get; } = Map.Select(m => m.Name).ToArray();

    public static string[] ToNames(PricingModel pricing) =>
        Map.Where(m => pricing.HasFlag(m.Flag)).Select(m => m.Name).ToArray();

    public static bool TryParse(string name, out PricingModel flag)
    {
        foreach (var (f, n) in Map)
        {
            if (string.Equals(n, name, StringComparison.OrdinalIgnoreCase))
            {
                flag = f;
                return true;
            }
        }

        flag = PricingModel.None;
        return false;
    }

    public static PricingModel Combine(IEnumerable<string>? names)
    {
        var result = PricingModel.None;
        foreach (var name in names ?? [])
        {
            if (TryParse(name, out var f))
            {
                result |= f;
            }
        }

        return result;
    }

    /// <summary>True when the app offers any free usage (free, freemium).</summary>
    public static bool HasFreeOption(PricingModel pricing) =>
        (pricing & (PricingModel.Free | PricingModel.Freemium)) != 0;
}
