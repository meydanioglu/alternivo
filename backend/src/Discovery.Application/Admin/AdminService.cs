using System.Text.Json;
using Discovery.Application.Abstractions;
using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

/// <summary>Privileged operations. Authorization is enforced by API policies before any call reaches here.</summary>
public sealed class AdminService(
    IAppDbContext db,
    ICacheService cache,
    CommunityService community,
    TimeProvider clock)
{
    // ---------- Dashboard ----------

    public async Task<AdminDashboardDto> DashboardAsync(CancellationToken ct) => new(
        await db.Applications.CountAsync(a => a.Status == PublicationStatus.Published && a.DeletedAt == null, ct),
        await db.Applications.CountAsync(a => a.Status == PublicationStatus.Draft && a.DeletedAt == null, ct),
        await db.Submissions.CountAsync(s => s.Status == SubmissionStatus.Pending, ct),
        await db.AlternativeRelationships.CountAsync(r => r.Status == ModerationStatus.Pending, ct),
        await db.Reports.CountAsync(r => r.Status == ReportStatus.Open, ct),
        await db.Reviews.CountAsync(ct));

    // ---------- Applications ----------

    public async Task<PagedResult<AdminApplicationRow>> ListApplicationsAsync(string? q, string? status, int? page, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, 50);
        var query = db.Applications.Where(a => a.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = $"%{q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_")}%";
            query = query.Where(a => EF.Functions.ILike(a.Name, term) || EF.Functions.ILike(a.Slug, term));
        }

        if (Enum.TryParse<PublicationStatus>(status, true, out var s))
        {
            query = query.Where(a => a.Status == s);
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(a => a.UpdatedAt)
            .Skip((p - 1) * size).Take(size)
            .Select(a => new AdminApplicationRow(a.Id, a.Slug, a.Name, a.Status.ToString(), a.Verification.ToString(),
                a.LikeCount, a.ReviewCount, a.UpdatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminApplicationRow>(rows, p, size, total);
    }

    public async Task<Guid> UpsertApplicationAsync(Guid actorId, Guid? id, UpsertApplicationRequest request, CancellationToken ct)
    {
        Validate(request);
        var now = clock.GetUtcNow();
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugs.Create(request.Name) : request.Slug.Trim();
        if (!Slugs.IsValid(slug))
        {
            throw new BadRequestException("Invalid slug.");
        }

        SoftwareApplication app;
        string? previousSlug = null;
        if (id is { } existingId)
        {
            app = await db.Applications
                .Include(a => a.Categories).Include(a => a.Platforms).Include(a => a.Features)
                .Include(a => a.Tags).Include(a => a.Aliases)
                .FirstOrDefaultAsync(a => a.Id == existingId && a.DeletedAt == null, ct)
                ?? throw new NotFoundException("Application", existingId.ToString());
            if (request.Version is { } version && version != app.Version)
            {
                throw new ConflictException("This application was changed by someone else. Reload and try again.");
            }

            if (app.Slug != slug)
            {
                previousSlug = app.Slug;
            }
        }
        else
        {
            app = new SoftwareApplication { Slug = slug, Name = request.Name, ShortDescription = request.ShortDescription };
            db.Applications.Add(app);
        }

        if (await db.Applications.AnyAsync(a => a.Slug == slug && a.Id != app.Id, ct))
        {
            throw new ConflictException($"The slug '{slug}' is already used.");
        }

        app.Slug = slug;
        app.Name = request.Name.Trim();
        app.ShortDescription = request.ShortDescription.Trim();
        app.Description = request.Description?.Trim();
        app.WebsiteUrl = request.WebsiteUrl?.Trim();
        if (request.LogoUrl is not null)
        {
            app.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        }

        app.Developer = request.Developer?.Trim();
        app.Pricing = PricingNames.Combine(request.Pricing);
        app.IsSelfHostable = request.IsSelfHostable;
        app.IsPrivacyFocused = request.IsPrivacyFocused;
        app.HasOfflineSupport = request.HasOfflineSupport;
        app.EditorialScore = request.EditorialScore;
        app.ReleasedOn = request.ReleasedOn;
        app.UpdatedAt = now;
        if (request.MarkVerified)
        {
            app.Verification = VerificationStatus.Verified;
            app.LastVerifiedAt = now;
            app.NeedsContentReview = false;
        }

        app.LicenseId = string.IsNullOrWhiteSpace(request.LicenseSlug)
            ? null
            : (await db.Licenses.FirstOrDefaultAsync(l => l.Slug == request.LicenseSlug, ct)
                ?? throw new BadRequestException($"Unknown license '{request.LicenseSlug}'.")).Id;

        var categorySlugs = (request.CategorySlugs ?? []).Append(request.PrimaryCategorySlug).OfType<string>().Distinct().ToArray();
        var categories = await ResolveAsync(db.Categories, categorySlugs, c => c.Slug, "category", ct);
        var platforms = await ResolveAsync(db.Platforms, request.PlatformSlugs ?? [], p => p.Slug, "platform", ct);
        var features = await ResolveAsync(db.Features, request.FeatureSlugs ?? [], f => f.Slug, "feature", ct);
        var tags = await ResolveOrCreateTagsAsync(request.TagSlugs ?? [], ct);

        var primaryId = categories.FirstOrDefault(c => c.Slug == request.PrimaryCategorySlug)?.Id ?? categories.FirstOrDefault()?.Id;
        Sync(app.Categories, categories.Select(c => c.Id), x => x.CategoryId,
            cid => new ApplicationCategory { ApplicationId = app.Id, CategoryId = cid });
        foreach (var c in app.Categories)
        {
            c.IsPrimary = c.CategoryId == primaryId;
        }

        Sync(app.Platforms, platforms.Select(p => p.Id), x => x.PlatformId,
            pid => new ApplicationPlatform { ApplicationId = app.Id, PlatformId = pid });
        Sync(app.Features, features.Select(f => f.Id), x => x.FeatureId,
            fid => new ApplicationFeature { ApplicationId = app.Id, FeatureId = fid });
        Sync(app.Tags, tags.Select(t => t.Id), x => x.TagId,
            tid => new ApplicationTag { ApplicationId = app.Id, TagId = tid });

        var aliases = (request.Aliases ?? []).Select(a => a.Trim()).Where(a => a.Length is > 0 and <= 100)
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        app.Aliases.RemoveAll(a => !aliases.Contains(a.Alias, StringComparer.OrdinalIgnoreCase));
        foreach (var alias in aliases.Where(a => !app.Aliases.Any(x => string.Equals(x.Alias, a, StringComparison.OrdinalIgnoreCase))))
        {
            app.Aliases.Add(new ApplicationAlias { ApplicationId = app.Id, Alias = alias });
        }

        app.SearchText = Catalog.SearchText.Build(app, aliases, categories.Select(c => c.Name),
            tags.Select(t => t.Name), features.Select(f => f.Name));

        // The new slug must never be shadowed by an older redirect.
        await db.SlugRedirects
            .Where(r => r.FromPath == $"/software/{slug}" || r.FromPath == $"/software/{slug}/alternatives")
            .ExecuteDeleteAsync(ct);

        if (previousSlug is not null)
        {
            await UpsertRedirectAsync($"/software/{previousSlug}", $"/software/{slug}", 301, ct);
            await UpsertRedirectAsync($"/software/{previousSlug}/alternatives", $"/software/{slug}/alternatives", 301, ct);
        }

        Audit(actorId, id is null ? "application.create" : "application.update", "Application", app.Id, new { app.Slug, previousSlug });
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(app.Slug, previousSlug, ct);
        return app.Id;
    }

    public async Task SetApplicationStatusAsync(Guid actorId, Guid id, string action, CancellationToken ct)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id && a.DeletedAt == null, ct)
            ?? throw new NotFoundException("Application", id.ToString());
        var now = clock.GetUtcNow();
        switch (action)
        {
            case "publish":
                app.Publish(now);
                break;
            case "unpublish":
                app.Status = PublicationStatus.Draft;
                app.UpdatedAt = now;
                break;
            case "archive":
                app.Archive(now);
                break;
            case "delete":
                app.DeletedAt = now;
                app.UpdatedAt = now;
                await UpsertRedirectAsync($"/software/{app.Slug}", null, 410, ct);
                break;
            default:
                throw new BadRequestException("Action must be publish, unpublish, archive or delete.");
        }

        Audit(actorId, $"application.{action}", "Application", app.Id, new { app.Slug });
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(app.Slug, null, ct);
    }

    // ---------- Submissions ----------

    public async Task<PagedResult<AdminSubmissionRow>> ListSubmissionsAsync(string? status, int? page, CancellationToken ct, string? q = null)
    {
        var (p, size) = Paging.Normalize(page, 50);
        var query = db.Submissions.AsQueryable();
        if (Enum.TryParse<SubmissionStatus>(status, true, out var s))
        {
            query = query.Where(x => x.Status == s);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = $"%{q.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, term) || EF.Functions.ILike(x.WebsiteUrl, term));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(x => x.CreatedAt).Skip((p - 1) * size).Take(size).AsNoTracking().ToListAsync(ct);
        return new PagedResult<AdminSubmissionRow>(
            rows.Select(x => new AdminSubmissionRow(x.Id, x.Name, x.WebsiteUrl, x.Description, x.CategorySlug,
                PricingNames.ToNames(x.Pricing), x.LicenseSlug, x.PlatformSlugs, x.Tags, x.SuggestedAlternativeSlugs,
                x.Status.ToString(), x.ModeratorNote, x.PossibleDuplicateApplicationId, x.SubmittedByUserId, x.CreatedAt)).ToList(),
            p, size, total);
    }

    public async Task<Guid?> DecideSubmissionAsync(Guid actorId, Guid id, string decision, string? note, CancellationToken ct)
    {
        var submission = await db.Submissions.FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new NotFoundException("Submission", id.ToString());
        if (submission.Status == SubmissionStatus.Approved)
        {
            throw new ConflictException("This submission is already approved.");
        }

        var now = clock.GetUtcNow();
        submission.ModeratorNote = note?.Trim();
        submission.ModeratedByUserId = actorId;
        submission.ModeratedAt = now;
        submission.UpdatedAt = now;

        switch (decision)
        {
            case "reject":
                submission.Status = SubmissionStatus.Rejected;
                break;
            case "needs-changes":
                submission.Status = SubmissionStatus.NeedsChanges;
                break;
            case "approve":
            {
                var tagSlugs = submission.Tags.Select(Slugs.Create).Where(Slugs.IsValid).ToArray();
                var appId = await UpsertApplicationAsync(actorId, null, new UpsertApplicationRequest(
                    submission.Name, null, Truncate(submission.Description, 200), submission.Description, submission.WebsiteUrl,
                    null, PricingNames.ToNames(submission.Pricing), submission.LicenseSlug, false, false, false, 0, null,
                    submission.CategorySlug, null, submission.PlatformSlugs.ToArray(), null, tagSlugs, null, false, null), ct);
                await SetApplicationStatusAsync(actorId, appId, "publish", ct);

                var altIds = await db.Applications
                    .Where(a => submission.SuggestedAlternativeSlugs.Contains(a.Slug) && a.DeletedAt == null)
                    .Select(a => a.Id)
                    .ToListAsync(ct);
                foreach (var altId in altIds)
                {
                    // Recorded in both directions; each direction can later be moderated independently.
                    AddApprovedRelationship(altId, appId, actorId, now);
                    AddApprovedRelationship(appId, altId, actorId, now);
                }

                submission.Status = SubmissionStatus.Approved;
                submission.CreatedApplicationId = appId;
                break;
            }

            default:
                throw new BadRequestException("Decision must be approve, reject or needs-changes.");
        }

        Audit(actorId, $"submission.{decision}", "Submission", submission.Id, new { note });
        await db.SaveChangesAsync(ct);
        return submission.CreatedApplicationId;
    }

    public Task<string?> GetApplicationSlugAsync(Guid id, CancellationToken ct) =>
        db.Applications.Where(a => a.Id == id).Select(a => (string?)a.Slug).FirstOrDefaultAsync(ct);

    public async Task<AdminSubmissionRow> GetSubmissionAsync(Guid id, CancellationToken ct)
    {
        var x = await db.Submissions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct) ?? throw new NotFoundException("Submission", id.ToString());
        return new AdminSubmissionRow(x.Id, x.Name, x.WebsiteUrl, x.Description, x.CategorySlug,
            PricingNames.ToNames(x.Pricing), x.LicenseSlug, x.PlatformSlugs, x.Tags, x.SuggestedAlternativeSlugs,
            x.Status.ToString(), x.ModeratorNote, x.PossibleDuplicateApplicationId, x.SubmittedByUserId, x.CreatedAt);
    }

    public async Task<IReadOnlyDictionary<string, int>> SubmissionCountsAsync(CancellationToken ct)
    {
        var counts = await db.Submissions.GroupBy(s => s.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        return Enum.GetValues<SubmissionStatus>()
            .ToDictionary(s => s.ToString().ToLowerInvariant(), s => counts.FirstOrDefault(c => c.Key == s)?.Count ?? 0);
    }

    /// <summary>Lets a moderator correct a submission before deciding on it. Approved submissions are read-only.</summary>
    public async Task UpdateSubmissionAsync(Guid actorId, Guid id, CreateSubmissionRequest r, CancellationToken ct)
    {
        var submission = await db.Submissions.FirstOrDefaultAsync(s => s.Id == id, ct) ?? throw new NotFoundException("Submission", id.ToString());
        if (submission.Status == SubmissionStatus.Approved)
            throw new ConflictException("This submission is already approved; edit the application instead.");
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Length > 100)
            throw new BadRequestException("Name is required (max 100 characters).");
        if (!UrlSafety.IsSafePublicWebUrl(r.WebsiteUrl))
            throw new BadRequestException("Enter a public http(s) website address.");
        if (string.IsNullOrWhiteSpace(r.Description) || r.Description.Length > 3000)
            throw new BadRequestException("Description is required (max 3000 characters).");
        if (r.CategorySlug is { Length: > 0 } cat && !await db.Categories.AnyAsync(c => c.Slug == cat, ct))
            throw new BadRequestException($"Unknown category '{cat}'.");

        submission.Name = r.Name.Trim();
        submission.WebsiteUrl = r.WebsiteUrl.Trim();
        submission.Description = r.Description.Trim();
        submission.CategorySlug = string.IsNullOrWhiteSpace(r.CategorySlug) ? null : r.CategorySlug;
        submission.Pricing = PricingNames.Combine(r.Pricing);
        submission.LicenseSlug = string.IsNullOrWhiteSpace(r.LicenseSlug) ? null : r.LicenseSlug;
        submission.PlatformSlugs = (r.Platforms ?? []).Where(Slugs.IsValid).Distinct().ToList();
        submission.Tags = (r.Tags ?? []).Select(t => t.Trim()).Where(t => t.Length is > 0 and <= 40).Distinct().Take(15).ToList();
        submission.SuggestedAlternativeSlugs = (r.SuggestedAlternatives ?? []).Select(x => x.Trim().ToLowerInvariant()).Where(Slugs.IsValid).Distinct().Take(10).ToList();
        submission.UpdatedAt = clock.GetUtcNow();
        Audit(actorId, "submission.edit", "Submission", submission.Id, null);
        await db.SaveChangesAsync(ct);
    }

    private void AddApprovedRelationship(Guid sourceId, Guid alternativeId, Guid actorId, DateTimeOffset now) =>
        db.AlternativeRelationships.Add(new AlternativeRelationship
        {
            SourceApplicationId = sourceId,
            AlternativeApplicationId = alternativeId,
            Source = RelationshipSource.Community,
            Status = ModerationStatus.Approved,
            ModeratedByUserId = actorId,
            ModeratedAt = now,
        });

    // ---------- Alternative relationships ----------

    public async Task<IReadOnlyList<AdminRelationshipRow>> ListRelationshipsAsync(string? status, CancellationToken ct)
    {
        var s = Enum.TryParse<ModerationStatus>(status, true, out var parsed) ? parsed : ModerationStatus.Pending;
        return await db.AlternativeRelationships
            .Where(r => r.Status == s)
            .OrderBy(r => r.CreatedAt)
            .Take(200)
            .Select(r => new AdminRelationshipRow(r.Id, r.SourceApplication!.Slug, r.SourceApplication.Name,
                r.AlternativeApplication!.Slug, r.AlternativeApplication.Name, r.Source.ToString(), r.Status.ToString(),
                r.Note, r.VoteCount, r.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task DecideRelationshipAsync(Guid actorId, Guid id, string decision, CancellationToken ct)
    {
        var relationship = await db.AlternativeRelationships.Include(r => r.SourceApplication)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Alternative", id.ToString());
        relationship.Status = decision switch
        {
            "approve" => ModerationStatus.Approved,
            "reject" => ModerationStatus.Rejected,
            _ => throw new BadRequestException("Decision must be approve or reject."),
        };
        relationship.ModeratedByUserId = actorId;
        relationship.ModeratedAt = clock.GetUtcNow();
        relationship.UpdatedAt = relationship.ModeratedAt.Value;
        Audit(actorId, $"alternative.{decision}", "AlternativeRelationship", id, null);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(relationship.SourceApplication?.Slug, null, ct);
    }

    // ---------- Reviews ----------

    public async Task<IReadOnlyList<AdminReviewRow>> ListReviewsAsync(string? status, CancellationToken ct)
    {
        var s = Enum.TryParse<ReviewStatus>(status, true, out var parsed) ? parsed : ReviewStatus.Pending;
        return await db.Reviews
            .Where(r => r.Status == s)
            .OrderByDescending(r => r.CreatedAt)
            .Take(200)
            .Select(r => new AdminReviewRow(r.Id, r.Application!.Slug, r.Rating, r.Title, r.Body, r.Status.ToString(), r.UserId, r.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task SetReviewStatusAsync(Guid actorId, Guid id, string status, CancellationToken ct)
    {
        var review = await db.Reviews.Include(r => r.Application).FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Review", id.ToString());
        review.Status = Enum.TryParse<ReviewStatus>(status, true, out var s)
            ? s
            : throw new BadRequestException("Status must be published, pending or hidden.");
        review.UpdatedAt = clock.GetUtcNow();
        Audit(actorId, $"review.{status.ToLowerInvariant()}", "Review", id, null);
        await db.SaveChangesAsync(ct);
        await community.RecalculateRatingAsync(review.ApplicationId, ct);
        await InvalidateAsync(review.Application?.Slug, null, ct);
    }

    // ---------- Reports ----------

    public async Task<IReadOnlyList<AdminReportRow>> ListReportsAsync(CancellationToken ct) =>
        await db.Reports
            .Where(r => r.Status == ReportStatus.Open)
            .OrderBy(r => r.CreatedAt)
            .Take(200)
            .Select(r => new AdminReportRow(r.Id, r.TargetType.ToString(), r.TargetId, r.Reason, r.Details, r.Status.ToString(), r.CreatedAt))
            .ToListAsync(ct);

    public async Task ResolveReportAsync(Guid actorId, Guid id, string decision, CancellationToken ct)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Report", id.ToString());
        report.Status = decision switch
        {
            "resolve" => ReportStatus.Resolved,
            "dismiss" => ReportStatus.Dismissed,
            _ => throw new BadRequestException("Decision must be resolve or dismiss."),
        };
        report.ResolvedByUserId = actorId;
        report.ResolvedAt = clock.GetUtcNow();
        Audit(actorId, $"report.{decision}", "Report", id, null);
        await db.SaveChangesAsync(ct);
    }

    // ---------- Redirects ----------

    public async Task CreateRedirectAsync(Guid actorId, CreateRedirectRequest request, CancellationToken ct)
    {
        if (!request.FromPath.StartsWith('/') || request.StatusCode is not (301 or 308 or 410)
            || (request.StatusCode != 410 && (request.ToPath is null || !request.ToPath.StartsWith('/'))))
        {
            throw new BadRequestException("Redirects need a site-relative from/to path and status 301, 308 or 410.");
        }

        await UpsertRedirectAsync(request.FromPath, request.ToPath, request.StatusCode, ct);
        Audit(actorId, "redirect.create", "SlugRedirect", null, request);
        await db.SaveChangesAsync(ct);
    }

    // ---------- Helpers ----------

    private static void Validate(UpsertApplicationRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Length > 100)
            throw new BadRequestException("Name is required (max 100 characters).");
        if (string.IsNullOrWhiteSpace(r.ShortDescription) || r.ShortDescription.Length > 200)
            throw new BadRequestException("Short description is required (max 200 characters).");
        if (r.Description is { Length: > 10_000 })
            throw new BadRequestException("Description is too long.");
        if (r.WebsiteUrl is not null && !UrlSafety.IsSafePublicWebUrl(r.WebsiteUrl))
            throw new BadRequestException("Website must be a public http(s) URL.");
        if (!string.IsNullOrWhiteSpace(r.LogoUrl) && !r.LogoUrl.StartsWith("/media/", StringComparison.Ordinal) && !UrlSafety.IsSafePublicWebUrl(r.LogoUrl))
            throw new BadRequestException("Logo must be a public http(s) image URL.");
        if (r.EditorialScore is < 0 or > 100)
            throw new BadRequestException("Editorial score must be between 0 and 100.");
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)].TrimEnd() + "…";

    private static async Task<List<T>> ResolveAsync<T>(
        DbSet<T> set, IReadOnlyCollection<string> slugs, Func<T, string> slugOf, string kind, CancellationToken ct)
        where T : Domain.Common.Entity
    {
        if (slugs.Count == 0)
        {
            return [];
        }

        var all = await set.ToListAsync(ct);
        var found = all.Where(x => slugs.Contains(slugOf(x))).ToList();
        var missing = slugs.Except(found.Select(slugOf)).FirstOrDefault();
        return missing is null ? found : throw new BadRequestException($"Unknown {kind} '{missing}'.");
    }

    private async Task<List<Tag>> ResolveOrCreateTagsAsync(IReadOnlyCollection<string> slugs, CancellationToken ct)
    {
        var valid = slugs.Where(Slugs.IsValid).Distinct().ToList();
        var existing = await db.Tags.Where(t => valid.Contains(t.Slug)).ToListAsync(ct);
        foreach (var slug in valid.Except(existing.Select(t => t.Slug)))
        {
            var tag = new Tag { Slug = slug, Name = slug.Replace('-', ' ') };
            db.Tags.Add(tag);
            existing.Add(tag);
        }

        return existing;
    }

    /// <summary>Diff-based sync of a join collection (avoids delete+insert of identical keys).</summary>
    private static void Sync<TJoin>(List<TJoin> current, IEnumerable<Guid> desired, Func<TJoin, Guid> key, Func<Guid, TJoin> create)
    {
        var target = desired.ToHashSet();
        current.RemoveAll(j => !target.Contains(key(j)));
        foreach (var id in target.Where(id => current.All(j => key(j) != id)))
        {
            current.Add(create(id));
        }
    }

    private async Task UpsertRedirectAsync(string from, string? to, int statusCode, CancellationToken ct)
    {
        var normalized = from.TrimEnd('/').ToLowerInvariant();
        var existing = await db.SlugRedirects.FirstOrDefaultAsync(r => r.FromPath == normalized, ct);
        if (existing is null)
        {
            db.SlugRedirects.Add(new SlugRedirect { FromPath = normalized, ToPath = to, StatusCode = statusCode });
        }
        else
        {
            existing.ToPath = to;
            existing.StatusCode = statusCode;
        }
    }

    private void Audit(Guid actorId, string action, string entityType, Guid? entityId, object? data) =>
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            DataJson = data is null ? null : JsonSerializer.Serialize(data),
        });

    private async Task InvalidateAsync(string? slug, string? previousSlug, CancellationToken ct)
    {
        foreach (var s in new[] { slug, previousSlug }.OfType<string>())
        {
            await cache.RemoveAsync(CacheKeys.Application(s), ct);
        }

        await cache.RemoveAsync(CacheKeys.Home, ct);
        await cache.RemoveAsync(CacheKeys.Categories, ct);
    }
}
