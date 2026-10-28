using System.Text.RegularExpressions;

namespace Discovery.Application.Community;

/// <summary>Pure checks for the "share Alternivo, get a faster free review" proofs.</summary>
public static partial class ShareProof
{
    /// <summary>True when the HTML has a link to alternivo.com (any page, http or https, with or without www).</summary>
    public static bool BadgeLinked(string? html) => html is not null && AlternivoLink().IsMatch(html);

    /// <summary>A public post URL on X (a /status/ link) or Substack (a note or post); https only.</summary>
    public static bool PostUrlValid(string? url)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps) return false;
        var host = u.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal)) host = host[4..];
        return host switch
        {
            "x.com" or "twitter.com" or "mobile.twitter.com" => XStatus().IsMatch(u.AbsolutePath),
            "substack.com" => u.AbsolutePath.Length > 1,
            _ => host.EndsWith(".substack.com", StringComparison.Ordinal) && u.AbsolutePath.Length > 1,
        };
    }

    /// <summary>The new free-review deadline after a valid proof: never later than before, never in the past.</summary>
    public static DateTimeOffset SharedDeadline(DateTimeOffset createdAt, DateTimeOffset? current, DateTimeOffset now, int days)
    {
        var target = createdAt.AddDays(days);
        if (target < now.AddDays(1)) target = now.AddDays(1);
        return current is { } c && c < target ? c : target;
    }

    /// <summary>Days an approved free listing may go without its badge before it is hidden.</summary>
    public const int BadgeGraceDays = 7;

    /// <summary>Days between rechecks of an approved free listing's badge.</summary>
    public const int BadgeRecheckDays = 7;

    /// <summary>
    /// What a periodic badge recheck does with an approved free listing. An unreachable homepage counts as missing:
    /// the grace period gives the owner time to fix either.
    /// </summary>
    public static BadgeRecheckAction Recheck(bool found, DateTimeOffset? missingSince, bool hidden, DateTimeOffset now) =>
        found ? (hidden ? BadgeRecheckAction.Restore : missingSince is null ? BadgeRecheckAction.None : BadgeRecheckAction.Clear)
        : missingSince is null ? BadgeRecheckAction.Warn
        : !hidden && now - missingSince.Value >= TimeSpan.FromDays(BadgeGraceDays) ? BadgeRecheckAction.Hide
        : BadgeRecheckAction.None;

    [GeneratedRegex(@"href\s*=\s*[""']?https?://(www\.)?alternivo\.com(/|[""'\s>])", RegexOptions.IgnoreCase)]
    private static partial Regex AlternivoLink();

    [GeneratedRegex(@"^/[A-Za-z0-9_]{1,15}/status/\d+")]
    private static partial Regex XStatus();
}

public enum BadgeRecheckAction
{
    None,
    /// <summary>Badge found again before the listing was hidden.</summary>
    Clear,
    /// <summary>Badge missing for the first time: start the grace period and e-mail the owner.</summary>
    Warn,
    /// <summary>Grace period over: unpublish the listing and e-mail the owner.</summary>
    Hide,
    /// <summary>Badge back on a hidden listing: publish it again.</summary>
    Restore,
}
