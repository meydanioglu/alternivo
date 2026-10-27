using System.Globalization;

namespace Discovery.Application.Admin;

/// <summary>Pure helpers for analytics: UTM parsing, source labels and date bucketing.</summary>
public static class TrafficSource
{
    public sealed record UtmTags(string? Source, string? Medium, string? Campaign);

    /// <summary>utm_source / utm_medium / utm_campaign from a path with a query string (trimmed, lowercased, max 100 chars).</summary>
    public static UtmTags Utm(string? pathAndQuery)
    {
        var q = pathAndQuery?.IndexOf('?') is int i and >= 0 ? pathAndQuery[(i + 1)..] : "";
        string? Get(string key)
        {
            foreach (var part in q.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (!kv[0].Equals(key, StringComparison.OrdinalIgnoreCase) || kv.Length < 2) continue;
                string v;
                try { v = Uri.UnescapeDataString(kv[1].Replace('+', ' ')).Trim().ToLowerInvariant(); }
                catch (UriFormatException) { return null; }
                return v.Length == 0 ? null : v.Length > 100 ? v[..100] : v;
            }

            return null;
        }

        return new UtmTags(Get("utm_source"), Get("utm_medium"), Get("utm_campaign"));
    }

    /// <summary>
    /// Human-readable source of a visit: the UTM source when present, otherwise a known referrer family
    /// (search engines, social networks, AI assistants), the referrer host, or "Direct".
    /// </summary>
    public static string Label(string? referrerHost, string? utmSource, string? ownHost)
    {
        if (!string.IsNullOrWhiteSpace(utmSource)) return $"utm: {utmSource}";
        var host = referrerHost?.ToLowerInvariant();
        if (string.IsNullOrEmpty(host) || (ownHost is not null && (host == ownHost || host == $"www.{ownHost}" || $"www.{host}" == ownHost)))
            return "Direct";
        if (host.Contains("google.")) return "Google";
        if (host.Contains("bing.")) return "Bing";
        if (host.Contains("duckduckgo.")) return "DuckDuckGo";
        if (host.Contains("yandex.")) return "Yandex";
        if (host is "chatgpt.com" or "chat.openai.com") return "ChatGPT";
        if (host.Contains("perplexity.")) return "Perplexity";
        if (host is "claude.ai") return "Claude";
        if (host.Contains("gemini.google")) return "Gemini";
        if (host is "t.co" or "x.com" or "twitter.com") return "X / Twitter";
        if (host.Contains("reddit.")) return "Reddit";
        if (host.Contains("linkedin.") || host == "lnkd.in") return "LinkedIn";
        if (host.Contains("facebook.") || host == "l.facebook.com") return "Facebook";
        if (host.Contains("producthunt.")) return "Product Hunt";
        if (host.Contains("news.ycombinator.")) return "Hacker News";
        if (host.Contains("substack.")) return "Substack";
        if (host.Contains("github.")) return "GitHub";
        return host;
    }

    public static string NormalizeGrain(string? grain) => grain is "week" or "month" ? grain : "day";

    /// <summary>Sums daily rows into weeks (Monday start) or calendar months; "day" returns the input.</summary>
    public static IReadOnlyList<DailyTraffic> Bucket(IReadOnlyList<DailyTraffic> daily, string? grain) =>
        NormalizeGrain(grain) switch
        {
            "week" => daily.GroupBy(d => d.Date.AddDays(-(((int)d.Date.DayOfWeek + 6) % 7)))
                .Select(g => new DailyTraffic(g.Key, g.Sum(x => x.Views), g.Sum(x => x.Visitors))).ToList(),
            "month" => daily.GroupBy(d => new DateOnly(d.Date.Year, d.Date.Month, 1))
                .Select(g => new DailyTraffic(g.Key, g.Sum(x => x.Views), g.Sum(x => x.Visitors))).ToList(),
            _ => daily,
        };

    public static bool TryDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
}
