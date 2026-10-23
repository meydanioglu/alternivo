using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Operations;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Application.Admin;

public sealed record QueueContentRequest(string Scope, Guid[]? ApplicationIds);

public sealed record ContentDraftRow(
    Guid Id,
    Guid ApplicationId,
    string ApplicationName,
    string ApplicationSlug,
    string? LogoUrl,
    string ApplicationStatus,
    string Status,
    string? ShortDescription,
    int SourceChars,
    string? Error,
    DateTimeOffset UpdatedAt);

public sealed record ContentDraftDetail(
    Guid Id,
    Guid ApplicationId,
    string ApplicationName,
    string ApplicationSlug,
    string? LogoUrl,
    string Status,
    string? Error,
    string? CurrentShortDescription,
    string? CurrentDescription,
    string? ShortDescription,
    string? Description,
    string? SeoTitle,
    string? SeoDescription,
    ContentSectionsDto? Sections,
    string? SourceUrl,
    int SourceChars,
    string? Model,
    int InputTokens,
    int OutputTokens,
    DateTimeOffset UpdatedAt);

public sealed record ApproveContentRequest(
    string ShortDescription,
    string Description,
    string? SeoTitle,
    string? SeoDescription,
    ContentSectionsDto Sections,
    bool Publish);

public sealed record ContentOverview(IReadOnlyDictionary<string, int> Counts, PagedResult<ContentDraftRow> Items, long InputTokens, long OutputTokens);

/// <summary>Queue, review and approve AI-drafted product content. Generation runs in the background worker.</summary>
public sealed class ContentService(IAppDbContext db, ICacheService cache, AdminService admin, TimeProvider clock)
{
    /// <summary>scope: "missing" (apps without approved content and no open draft), "all", or "selected" (ApplicationIds).</summary>
    public async Task<int> QueueAsync(Guid userId, QueueContentRequest request, CancellationToken ct)
    {
        var open = new[] { ContentDraftStatus.Queued, ContentDraftStatus.Generating, ContentDraftStatus.Ready };
        var apps = db.Applications.Where(a => a.DeletedAt == null);
        apps = request.Scope switch
        {
            "selected" => apps.Where(a => (request.ApplicationIds ?? Array.Empty<Guid>()).Contains(a.Id)),
            "all" => apps,
            _ => apps.Where(a => a.ContentApprovedAt == null),
        };

        var ids = await apps
            .Where(a => !db.ContentDrafts.Any(d => d.ApplicationId == a.Id && open.Contains(d.Status)))
            .OrderByDescending(a => a.Status == PublicationStatus.Published).ThenBy(a => a.Name)
            .Select(a => a.Id)
            .ToListAsync(ct);

        var now = clock.GetUtcNow();
        var i = 0;
        foreach (var id in ids)
        {
            db.ContentDrafts.Add(new ContentDraft { ApplicationId = id, RequestedByUserId = userId, CreatedAt = now.AddTicks(i++), UpdatedAt = now });
        }

        await db.SaveChangesAsync(ct);
        return ids.Count;
    }

    public async Task<ContentOverview> ListAsync(string? status, string? q, int? page, CancellationToken ct)
    {
        var counts = await db.ContentDrafts.GroupBy(d => d.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        var countMap = Enum.GetValues<ContentDraftStatus>()
            .ToDictionary(s => s.ToString().ToLowerInvariant(), s => counts.FirstOrDefault(c => c.Key == s)?.Count ?? 0);
        var inputTokens = await db.ContentDrafts.SumAsync(d => (long)d.InputTokens, ct);
        var outputTokens = await db.ContentDrafts.SumAsync(d => (long)d.OutputTokens, ct);

        var (p, size) = Paging.Normalize(page, 50);
        var query = from d in db.ContentDrafts
                    join a in db.Applications on d.ApplicationId equals a.Id
                    select new { d, a };
        if (Enum.TryParse<ContentDraftStatus>(status, true, out var s)) query = query.Where(x => x.d.Status == s);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = $"%{q.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.a.Name, term));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.d.UpdatedAt).Skip((p - 1) * size).Take(size)
            .Select(x => new ContentDraftRow(x.d.Id, x.a.Id, x.a.Name, x.a.Slug, x.a.LogoUrl, x.a.Status.ToString(), x.d.Status.ToString(),
                x.d.ShortDescription, x.d.SourceChars, x.d.Error, x.d.UpdatedAt))
            .ToListAsync(ct);
        return new ContentOverview(countMap, new PagedResult<ContentDraftRow>(rows, p, size, total), inputTokens, outputTokens);
    }

    public async Task<ContentDraftDetail> GetAsync(Guid id, CancellationToken ct)
    {
        var x = await (from d in db.ContentDrafts
                       join a in db.Applications on d.ApplicationId equals a.Id
                       where d.Id == id
                       select new { d, a }).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Content draft", id.ToString());
        return new ContentDraftDetail(x.d.Id, x.a.Id, x.a.Name, x.a.Slug, x.a.LogoUrl, x.d.Status.ToString(), x.d.Error,
            x.a.ShortDescription, x.a.Description, x.d.ShortDescription, x.d.Description, x.d.SeoTitle, x.d.SeoDescription,
            ContentJson.Parse(x.d.SectionsJson), x.d.SourceUrl, x.d.SourceChars, x.d.Model, x.d.InputTokens, x.d.OutputTokens, x.d.UpdatedAt);
    }

    /// <summary>Writes the (possibly edited) draft onto the application. Approval marks the record editor-verified.</summary>
    public async Task ApproveAsync(Guid userId, Guid id, ApproveContentRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.ShortDescription) || r.ShortDescription.Length > 200)
            throw new BadRequestException("Short description is required (max 200 characters).");
        if (string.IsNullOrWhiteSpace(r.Description) || r.Description.Length > 10_000)
            throw new BadRequestException("Description is required (max 10,000 characters).");
        if (r.SeoTitle is { Length: > 70 }) throw new BadRequestException("SEO title must be at most 70 characters.");
        if (r.SeoDescription is { Length: > 170 }) throw new BadRequestException("SEO description must be at most 170 characters.");

        var draft = await db.ContentDrafts.FirstOrDefaultAsync(d => d.Id == id, ct) ?? throw new NotFoundException("Content draft", id.ToString());
        if (draft.Status is ContentDraftStatus.Queued or ContentDraftStatus.Generating)
            throw new ConflictException("This draft is still being generated.");
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == draft.ApplicationId && a.DeletedAt == null, ct)
            ?? throw new NotFoundException("Application", draft.ApplicationId.ToString());

        var now = clock.GetUtcNow();
        app.ShortDescription = r.ShortDescription.Trim();
        app.Description = r.Description.Trim();
        app.SeoTitle = string.IsNullOrWhiteSpace(r.SeoTitle) ? null : r.SeoTitle.Trim();
        app.SeoDescription = string.IsNullOrWhiteSpace(r.SeoDescription) ? null : r.SeoDescription.Trim();
        app.ContentJson = ContentJson.Serialize(r.Sections);
        app.ContentApprovedAt = now;
        app.Verification = VerificationStatus.Verified;
        app.LastVerifiedAt = now;
        app.UpdatedAt = now;

        draft.Status = ContentDraftStatus.Approved;
        draft.ShortDescription = app.ShortDescription;
        draft.Description = app.Description;
        draft.SeoTitle = app.SeoTitle;
        draft.SeoDescription = app.SeoDescription;
        draft.SectionsJson = app.ContentJson;
        draft.ReviewedByUserId = userId;
        draft.ReviewedAt = now;
        draft.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        if (r.Publish && app.Status != PublicationStatus.Published)
        {
            await admin.SetApplicationStatusAsync(userId, app.Id, "publish", ct);
        }

        await cache.RemoveAsync(CacheKeys.Application(app.Slug), ct);
        await cache.RemoveAsync(CacheKeys.Home, ct);
    }

    public async Task RejectAsync(Guid userId, Guid id, CancellationToken ct)
    {
        var draft = await db.ContentDrafts.FirstOrDefaultAsync(d => d.Id == id, ct) ?? throw new NotFoundException("Content draft", id.ToString());
        draft.Status = ContentDraftStatus.Rejected;
        draft.ReviewedByUserId = userId;
        draft.ReviewedAt = draft.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Re-queues one draft (regenerate) or every failed draft.</summary>
    public async Task<int> RequeueAsync(Guid? id, CancellationToken ct)
    {
        var query = id is { } one
            ? db.ContentDrafts.Where(d => d.Id == one && d.Status != ContentDraftStatus.Generating)
            : db.ContentDrafts.Where(d => d.Status == ContentDraftStatus.Failed);
        return await query.ExecuteUpdateAsync(s => s
            .SetProperty(d => d.Status, ContentDraftStatus.Queued)
            .SetProperty(d => d.Attempts, 0)
            .SetProperty(d => d.Error, (string?)null)
            .SetProperty(d => d.UpdatedAt, clock.GetUtcNow()), ct);
    }

    /// <summary>Stops pending work: queued drafts are removed.</summary>
    public Task<int> CancelQueuedAsync(CancellationToken ct) =>
        db.ContentDrafts.Where(d => d.Status == ContentDraftStatus.Queued).ExecuteDeleteAsync(ct);
}
