using System.Globalization;
using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Catalog;

public sealed record LaunchItemDto(int Rank, ApplicationSummaryDto Application, int Votes, DateTimeOffset LaunchedAt);

public sealed record LaunchWeekDto(
    string Week,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    bool IsCurrent,
    string? PreviousWeek,
    string? NextWeek,
    IReadOnlyList<LaunchItemDto> Items);

public sealed record LaunchArchiveWeekDto(string Week, DateTimeOffset StartsAt, int LaunchCount, IReadOnlyList<LaunchItemDto> Winners);

public sealed record LeaderboardItemDto(int Rank, ApplicationSummaryDto Application, int Votes);

/// <summary>
/// Weekly launch board ("this week's launches") and the all-time/periodic leaderboard.
/// A launch is a community submission approved by a moderator; its week is the ISO week (UTC) it was published in.
/// A launch's weekly score counts only likes cast during that week, so later likes never rewrite past results.
/// </summary>
public sealed class LaunchService(IAppDbContext db, CatalogService catalog, TimeProvider clock)
{
    public static (DateTimeOffset Start, DateTimeOffset End) WeekRange(DateTimeOffset instant)
    {
        var date = instant.UtcDateTime.Date;
        var offset = ((int)date.DayOfWeek + 6) % 7; // Monday = 0
        var start = new DateTimeOffset(date.AddDays(-offset), TimeSpan.Zero);
        return (start, start.AddDays(7));
    }

    public static string WeekKey(DateTimeOffset start) =>
        $"{ISOWeek.GetYear(start.UtcDateTime)}-W{ISOWeek.GetWeekOfYear(start.UtcDateTime):00}";

    public static DateTimeOffset? ParseWeek(string? key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;
        var parts = key.Split("-W", StringSplitOptions.TrimEntries);
        if (parts.Length != 2 || !int.TryParse(parts[0], out var year) || !int.TryParse(parts[1], out var week)
            || year is < 2000 or > 2100 || week < 1 || week > ISOWeek.GetWeeksInYear(year))
        {
            return null;
        }

        return new DateTimeOffset(ISOWeek.ToDateTime(year, week, DayOfWeek.Monday), TimeSpan.Zero);
    }

    private IQueryable<Guid> LaunchedApplicationIds() =>
        db.Submissions
            .Where(s => s.Status == SubmissionStatus.Approved && s.CreatedApplicationId != null)
            .Select(s => s.CreatedApplicationId!.Value);

    private async Task<List<LaunchItemDto>> RankWeekAsync(DateTimeOffset start, DateTimeOffset end, int take, CancellationToken ct)
    {
        var launched = LaunchedApplicationIds();
        var rows = await catalog.Visible()
            .Where(a => launched.Contains(a.Id) && a.PublishedAt >= start && a.PublishedAt < end)
            .Select(a => new
            {
                a.Id,
                PublishedAt = a.PublishedAt!.Value,
                Votes = db.ApplicationVotes.Count(v => v.ApplicationId == a.Id && v.CreatedAt >= start && v.CreatedAt < end),
            })
            .OrderByDescending(x => x.Votes).ThenBy(x => x.PublishedAt)
            .Take(take)
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var apps = await db.Applications.Where(a => ids.Contains(a.Id)).WithSummaryIncludes().ToDictionaryAsync(a => a.Id, ct);
        return rows.Select((r, i) => new LaunchItemDto(i + 1, apps[r.Id].ToSummary(), r.Votes, r.PublishedAt)).ToList();
    }

    public async Task<LaunchWeekDto> GetWeekAsync(string? week, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var (currentStart, _) = WeekRange(now);
        var start = ParseWeek(week) ?? currentStart;
        if (start > currentStart)
        {
            throw new NotFoundException("Launch week", week ?? string.Empty);
        }

        var end = start.AddDays(7);
        var items = await RankWeekAsync(start, end, 100, ct);
        var isCurrent = start == currentStart;
        return new LaunchWeekDto(
            WeekKey(start), start, end, isCurrent,
            WeekKey(start.AddDays(-7)),
            isCurrent ? null : WeekKey(start.AddDays(7)),
            items);
    }

    /// <summary>Past weeks that had launches, newest first, with their top three.</summary>
    public async Task<IReadOnlyList<LaunchArchiveWeekDto>> GetArchiveAsync(int weeks, CancellationToken ct)
    {
        var (currentStart, _) = WeekRange(clock.GetUtcNow());
        var from = currentStart.AddDays(-7 * Math.Clamp(weeks, 1, 104));
        var launched = LaunchedApplicationIds();
        var dates = await catalog.Visible()
            .Where(a => launched.Contains(a.Id) && a.PublishedAt >= from && a.PublishedAt < currentStart)
            .Select(a => a.PublishedAt!.Value)
            .ToListAsync(ct);

        var result = new List<LaunchArchiveWeekDto>();
        foreach (var group in dates.GroupBy(d => WeekRange(d).Start).OrderByDescending(g => g.Key))
        {
            var winners = await RankWeekAsync(group.Key, group.Key.AddDays(7), 3, ct);
            result.Add(new LaunchArchiveWeekDto(WeekKey(group.Key), group.Key, group.Count(), winners));
        }

        return result;
    }

    /// <summary>period: week | month | all. "all" ranks by total likes; the others by likes cast in the period.</summary>
    public async Task<PagedResult<LeaderboardItemDto>> GetLeaderboardAsync(string? period, int? page, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, 50);
        var now = clock.GetUtcNow();
        DateTimeOffset? since = period switch
        {
            "week" => now.AddDays(-7),
            "month" => now.AddDays(-30),
            _ => null,
        };

        var visible = catalog.Visible();
        var scored = since is { } s
            ? visible.Select(a => new { a.Id, a.Name, a.EditorialScore, Votes = db.ApplicationVotes.Count(v => v.ApplicationId == a.Id && v.CreatedAt >= s) })
            : visible.Select(a => new { a.Id, a.Name, a.EditorialScore, Votes = a.LikeCount });

        var total = await scored.CountAsync(ct);
        var rows = await scored
            .OrderByDescending(x => x.Votes).ThenByDescending(x => x.EditorialScore).ThenBy(x => x.Name)
            .Skip((p - 1) * size).Take(size)
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var apps = await db.Applications.Where(a => ids.Contains(a.Id)).WithSummaryIncludes().ToDictionaryAsync(a => a.Id, ct);
        var offset = (p - 1) * size;
        var items = rows.Select((r, i) => new LeaderboardItemDto(offset + i + 1, apps[r.Id].ToSummary(), r.Votes)).ToList();
        return new PagedResult<LeaderboardItemDto>(items, p, size, total);
    }
}
