using Discovery.Application.Abstractions;
using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Community;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Community;

/// <summary>Authenticated community actions. The API layer guarantees an authenticated user id.</summary>
public sealed class CommunityService(
    IAppDbContext db,
    ICacheService cache,
    CatalogService catalog,
    IUserDirectory users,
    IValidator<CreateReviewRequest> reviewValidator,
    IValidator<CreateSubmissionRequest> submissionValidator,
    TimeProvider clock)
{
    // ---------- Likes ----------

    public async Task<VoteStateDto> SetApplicationVoteAsync(Guid userId, Guid applicationId, bool vote, CancellationToken ct)
    {
        var slug = await RequireVisibleAppSlugAsync(applicationId, ct);
        var existing = await db.ApplicationVotes.FindAsync([applicationId, userId], ct);
        if (vote && existing is null)
        {
            db.ApplicationVotes.Add(new ApplicationVote { ApplicationId = applicationId, UserId = userId });
            await SaveIgnoringDuplicateAsync(ct);
        }
        else if (!vote && existing is not null)
        {
            db.ApplicationVotes.Remove(existing);
            await db.SaveChangesAsync(ct);
        }

        await db.Applications
            .Where(a => a.Id == applicationId)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.LikeCount, a => db.ApplicationVotes.Count(v => v.ApplicationId == a.Id)), ct);
        var count = await db.ApplicationVotes.CountAsync(v => v.ApplicationId == applicationId, ct);
        await InvalidateAsync(slug, ct);
        return new VoteStateDto(vote, count);
    }

    public async Task<VoteStateDto> GetApplicationVoteAsync(Guid userId, Guid applicationId, CancellationToken ct)
    {
        var voted = await db.ApplicationVotes.AnyAsync(v => v.ApplicationId == applicationId && v.UserId == userId, ct);
        var count = await db.ApplicationVotes.CountAsync(v => v.ApplicationId == applicationId, ct);
        return new VoteStateDto(voted, count);
    }

    // ---------- Alternative votes & suggestions ----------

    public async Task<VoteStateDto> SetAlternativeVoteAsync(Guid userId, Guid relationshipId, bool vote, CancellationToken ct)
    {
        var relationship = await db.AlternativeRelationships
            .Where(r => r.Id == relationshipId && r.Status == ModerationStatus.Approved)
            .Select(r => new { r.Id, SourceSlug = r.SourceApplication!.Slug })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Alternative", relationshipId.ToString());

        var existing = await db.AlternativeVotes.FindAsync([relationshipId, userId], ct);
        if (vote && existing is null)
        {
            db.AlternativeVotes.Add(new AlternativeVote { RelationshipId = relationshipId, UserId = userId });
            await SaveIgnoringDuplicateAsync(ct);
        }
        else if (!vote && existing is not null)
        {
            db.AlternativeVotes.Remove(existing);
            await db.SaveChangesAsync(ct);
        }

        await db.AlternativeRelationships
            .Where(r => r.Id == relationshipId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.VoteCount, r => db.AlternativeVotes.Count(v => v.RelationshipId == r.Id)), ct);
        var count = await db.AlternativeVotes.CountAsync(v => v.RelationshipId == relationshipId, ct);
        await InvalidateAsync(relationship.SourceSlug, ct);
        return new VoteStateDto(vote, count);
    }

    /// <summary>Suggests "alternative is an alternative to source". Enters the moderation queue.</summary>
    public async Task<Guid> SuggestAlternativeAsync(Guid userId, string sourceSlug, SuggestAlternativeRequest request, CancellationToken ct)
    {
        if (!Slugs.IsValid(request.AlternativeSlug) || request.Note is { Length: > 500 })
        {
            throw new BadRequestException("Invalid alternative suggestion.");
        }

        var ids = await catalog.Visible()
            .Where(a => a.Slug == sourceSlug || a.Slug == request.AlternativeSlug)
            .Select(a => new { a.Id, a.Slug })
            .ToListAsync(ct);
        var source = ids.FirstOrDefault(x => x.Slug == sourceSlug) ?? throw new NotFoundException("Application", sourceSlug);
        var alternative = ids.FirstOrDefault(x => x.Slug == request.AlternativeSlug)
            ?? throw new NotFoundException("Application", request.AlternativeSlug);
        if (source.Id == alternative.Id)
        {
            throw new BadRequestException("An application cannot be an alternative to itself.");
        }

        var existing = await db.AlternativeRelationships
            .FirstOrDefaultAsync(r => r.SourceApplicationId == source.Id && r.AlternativeApplicationId == alternative.Id, ct);
        if (existing is not null)
        {
            if (existing.Status == ModerationStatus.Approved)
            {
                // Suggesting an existing approved alternative counts as agreement.
                await SetAlternativeVoteAsync(userId, existing.Id, true, ct);
            }

            return existing.Id;
        }

        var relationship = new AlternativeRelationship
        {
            SourceApplicationId = source.Id,
            AlternativeApplicationId = alternative.Id,
            Source = RelationshipSource.Community,
            Status = ModerationStatus.Pending,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            SuggestedByUserId = userId,
        };
        db.AlternativeRelationships.Add(relationship);
        await db.SaveChangesAsync(ct);
        return relationship.Id;
    }

    // ---------- Bookmarks ----------

    public async Task SetBookmarkAsync(Guid userId, Guid applicationId, bool saved, CancellationToken ct)
    {
        await RequireVisibleAppSlugAsync(applicationId, ct);
        var existing = await db.UserBookmarks.FindAsync([applicationId, userId], ct);
        if (saved && existing is null)
        {
            db.UserBookmarks.Add(new UserBookmark { ApplicationId = applicationId, UserId = userId });
            await SaveIgnoringDuplicateAsync(ct);
        }
        else if (!saved && existing is not null)
        {
            db.UserBookmarks.Remove(existing);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<ApplicationSummaryDto>> GetBookmarksAsync(Guid userId, CancellationToken ct)
    {
        var ids = await db.UserBookmarks
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => b.ApplicationId)
            .Take(500)
            .ToListAsync(ct);
        var summaries = await catalog.LoadSummariesAsync(ids, ct);
        return ids.Where(summaries.ContainsKey).Select(id => summaries[id]).ToList();
    }

    /// <summary>Public activity for a profile page: published reviews, liked apps and launched products.</summary>
    public async Task<UserActivityDto> GetUserActivityAsync(Guid userId, string authorName, bool includeLikes, CancellationToken ct)
    {
        var reviews = await db.Reviews
            .Where(r => r.UserId == userId && r.Status == ReviewStatus.Published)
            .Include(r => r.Application)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var likedIds = includeLikes
            ? await db.ApplicationVotes.Where(v => v.UserId == userId).OrderByDescending(v => v.CreatedAt)
                .Select(v => v.ApplicationId).Take(60).ToListAsync(ct)
            : [];
        var launchedIds = await db.Submissions
            .Where(s => s.SubmittedByUserId == userId && s.Status == SubmissionStatus.Approved && s.CreatedApplicationId != null)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => s.CreatedApplicationId!.Value)
            .Take(60)
            .ToListAsync(ct);

        var summaries = await catalog.LoadSummariesAsync(likedIds.Concat(launchedIds).Distinct().ToList(), ct);
        return new UserActivityDto(
            reviews.Where(r => r.Application is not null && r.Application.IsPubliclyVisible)
                .Select(r => r.ToDto(authorName, new NamedRef(r.Application!.Slug, r.Application.Name))).ToList(),
            likedIds.Where(summaries.ContainsKey).Select(id => summaries[id]).ToList(),
            launchedIds.Where(summaries.ContainsKey).Select(id => summaries[id]).ToList());
    }

    // ---------- Reviews ----------

    public async Task<PagedResult<ReviewDto>> GetReviewsAsync(Guid applicationId, int? page, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, 10);
        var query = db.Reviews.Where(r => r.ApplicationId == applicationId && r.Status == ReviewStatus.Published);
        var total = await query.CountAsync(ct);
        var reviews = await query
            .OrderByDescending(r => r.HelpfulCount).ThenByDescending(r => r.CreatedAt)
            .Skip((p - 1) * size).Take(size)
            .AsNoTracking()
            .ToListAsync(ct);
        var names = await users.GetDisplayNamesAsync(reviews.Select(r => r.UserId), ct);
        return new PagedResult<ReviewDto>(
            reviews.Select(r => r.ToDto(names.GetValueOrDefault(r.UserId, "Community member"))).ToList(), p, size, total);
    }

    public async Task<ReviewDto> CreateReviewAsync(Guid userId, Guid applicationId, CreateReviewRequest request, CancellationToken ct)
    {
        await reviewValidator.ValidateAndThrowAsync(request, ct);
        var slug = await RequireVisibleAppSlugAsync(applicationId, ct);
        if (await db.Reviews.AnyAsync(r => r.ApplicationId == applicationId && r.UserId == userId, ct))
        {
            throw new ConflictException("You have already reviewed this application. Edit your existing review instead.");
        }

        var review = new Domain.Community.Review
        {
            ApplicationId = applicationId,
            UserId = userId,
            Rating = request.Rating,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Pros = request.Pros?.Trim(),
            Cons = request.Cons?.Trim(),
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync(ct);
        await RecalculateRatingAsync(applicationId, ct);
        await InvalidateAsync(slug, ct);

        var names = await users.GetDisplayNamesAsync([userId], ct);
        return review.ToDto(names.GetValueOrDefault(userId, "Community member"));
    }

    public async Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid reviewId, UpdateReviewRequest request, CancellationToken ct)
    {
        await reviewValidator.ValidateAndThrowAsync(
            new CreateReviewRequest(request.Rating, request.Title, request.Body, request.Pros, request.Cons), ct);
        var review = await db.Reviews.Include(r => r.Application).FirstOrDefaultAsync(r => r.Id == reviewId, ct)
            ?? throw new NotFoundException("Review", reviewId.ToString());
        if (review.UserId != userId)
        {
            throw new ForbiddenException("You can only edit your own review.");
        }

        review.Rating = request.Rating;
        review.Title = request.Title.Trim();
        review.Body = request.Body.Trim();
        review.Pros = request.Pros?.Trim();
        review.Cons = request.Cons?.Trim();
        review.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await RecalculateRatingAsync(review.ApplicationId, ct);
        await InvalidateAsync(review.Application?.Slug, ct);

        var names = await users.GetDisplayNamesAsync([userId], ct);
        return review.ToDto(names.GetValueOrDefault(userId, "Community member"));
    }

    internal async Task RecalculateRatingAsync(Guid applicationId, CancellationToken ct)
    {
        var published = db.Reviews.Where(r => r.ApplicationId == applicationId && r.Status == ReviewStatus.Published);
        var count = await published.CountAsync(ct);
        decimal? average = count == 0 ? null : Math.Round(await published.AverageAsync(r => (decimal)r.Rating, ct), 2);
        await db.Applications
            .Where(a => a.Id == applicationId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.ReviewCount, count)
                .SetProperty(a => a.RatingAverage, average), ct);
    }

    // ---------- Submissions ----------

    public async Task<Guid> CreateSubmissionAsync(Guid userId, CreateSubmissionRequest request, CancellationToken ct)
    {
        await submissionValidator.ValidateAndThrowAsync(request, ct);

        var pendingCount = await db.Submissions.CountAsync(s => s.SubmittedByUserId == userId && s.Status == SubmissionStatus.Pending, ct);
        if (pendingCount >= 10)
        {
            throw new ConflictException("You have too many pending submissions. Please wait for moderation.");
        }

        var duplicateId = await FindLikelyDuplicateAsync(request.Name, request.WebsiteUrl, ct);
        var submission = new Submission
        {
            SubmittedByUserId = userId,
            Name = request.Name.Trim(),
            WebsiteUrl = request.WebsiteUrl.Trim(),
            Description = request.Description.Trim(),
            CategorySlug = request.CategorySlug,
            Pricing = PricingNames.Combine(request.Pricing),
            LicenseSlug = request.LicenseSlug,
            PlatformSlugs = [.. (request.Platforms ?? []).Distinct()],
            Tags = [.. (request.Tags ?? []).Select(t => t.Trim()).Where(t => t.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase)],
            ScreenshotUrls = [.. (request.ScreenshotUrls ?? []).Distinct()],
            SuggestedAlternativeSlugs = [.. (request.SuggestedAlternatives ?? []).Distinct()],
            PossibleDuplicateApplicationId = duplicateId,
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync(ct);
        return submission.Id;
    }

    /// <summary>Matches on normalised website host first, then on the slug of the name.</summary>
    internal async Task<Guid?> FindLikelyDuplicateAsync(string name, string websiteUrl, CancellationToken ct)
    {
        var host = UrlSafety.NormalizedHost(websiteUrl);
        if (host is not null)
        {
            var candidates = await db.Applications
                .Where(a => a.DeletedAt == null && a.WebsiteUrl != null && a.WebsiteUrl.Contains(host))
                .Select(a => new { a.Id, a.WebsiteUrl })
                .Take(20)
                .ToListAsync(ct);
            var match = candidates.FirstOrDefault(c => UrlSafety.NormalizedHost(c.WebsiteUrl) == host);
            if (match is not null)
            {
                return match.Id;
            }
        }

        var slug = Slugs.Create(name);
        return await db.Applications
            .Where(a => a.DeletedAt == null && (a.Slug == slug || a.Aliases.Any(al => al.Alias.ToLower() == name.ToLower())))
            .Select(a => (Guid?)a.Id)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<object>> GetMySubmissionsAsync(Guid userId, CancellationToken ct) =>
        await db.Submissions
            .Where(s => s.SubmittedByUserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(100)
            .Select(s => (object)new { s.Id, s.Name, s.WebsiteUrl, Status = s.Status.ToString(), s.ModeratorNote, s.CreatedAt })
            .ToListAsync(ct);

    // ---------- Reports ----------

    public async Task<Guid> CreateReportAsync(Guid userId, CreateReportRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<ReportTargetType>(request.TargetType, ignoreCase: true, out var target)
            || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 100
            || request.Details is { Length: > 2000 })
        {
            throw new BadRequestException("Invalid report.");
        }

        var recent = await db.Reports.CountAsync(r => r.ReporterUserId == userId && r.CreatedAt > clock.GetUtcNow().AddHours(-1), ct);
        if (recent >= 20)
        {
            throw new ConflictException("Too many reports in a short time.");
        }

        var report = new Report
        {
            TargetType = target,
            TargetId = request.TargetId,
            Reason = request.Reason.Trim(),
            Details = request.Details?.Trim(),
            ReporterUserId = userId,
        };
        db.Reports.Add(report);
        await db.SaveChangesAsync(ct);
        return report.Id;
    }

    // ---------- Helpers ----------

    private async Task<string> RequireVisibleAppSlugAsync(Guid applicationId, CancellationToken ct) =>
        await catalog.Visible().Where(a => a.Id == applicationId).Select(a => a.Slug).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Application", applicationId.ToString());

    /// <summary>Concurrent double-clicks hit the composite primary key; treat that as success.</summary>
    private async Task SaveIgnoringDuplicateAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.GetType().Name == "PostgresException"
                                           && ex.InnerException.Message.Contains("23505"))
        {
            // Unique violation: the vote already exists.
        }
    }

    private async Task InvalidateAsync(string? slug, CancellationToken ct)
    {
        if (slug is not null)
        {
            await cache.RemoveAsync(CacheKeys.Application(slug), ct);
        }

        await cache.RemoveAsync(CacheKeys.Home, ct);
    }
}
