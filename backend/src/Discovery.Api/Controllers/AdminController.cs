using Discovery.Api.Infrastructure;
using Discovery.Application.Admin;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Discovery.Api.Controllers;

/// <summary>
/// Admin API. Every action is authorised server-side by role policy; the frontend hiding
/// buttons is never relied on.
/// </summary>
[ApiController]
[Route("api/v1/admin")]
[Produces("application/json")]
[Authorize(Policy = Policies.Staff)]
public sealed class AdminController(AdminService admin, HttpCurrentUser current) : ControllerBase
{
    [HttpGet("dashboard")]
    public Task<AdminDashboardDto> Dashboard(CancellationToken ct) => admin.DashboardAsync(ct);

    // ----- Applications (editors) -----

    [HttpGet("applications")]
    [Authorize(Policy = Policies.Editorial)]
    public Task<PagedResult<AdminApplicationRow>> Applications([FromQuery] string? q, [FromQuery] string? status, [FromQuery] int? page, CancellationToken ct) =>
        admin.ListApplicationsAsync(q, status, page, ct);

    [HttpPost("applications")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> CreateApplication(UpsertApplicationRequest request, CancellationToken ct)
    {
        var id = await admin.UpsertApplicationAsync(current.RequireUserId(), null, request, ct);
        return StatusCode(StatusCodes.Status201Created, new { id });
    }

    [HttpPut("applications/{id:guid}")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> UpdateApplication(Guid id, UpsertApplicationRequest request, CancellationToken ct)
    {
        await admin.UpsertApplicationAsync(current.RequireUserId(), id, request, ct);
        return NoContent();
    }

    /// <summary>operation: publish | unpublish | archive | delete (soft delete, returns 410 on the public URL).</summary>
    [HttpPost("applications/{id:guid}/{operation:regex(^(publish|unpublish|archive|delete)$)}")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> SetApplicationStatus(Guid id, string operation, CancellationToken ct)
    {
        await admin.SetApplicationStatusAsync(current.RequireUserId(), id, operation, ct);
        return NoContent();
    }

    // ----- Submissions (moderators) -----

    [HttpGet("submissions")]
    [Authorize(Policy = Policies.Moderation)]
    public Task<PagedResult<AdminSubmissionRow>> Submissions([FromQuery] string? status, [FromQuery] int? page, CancellationToken ct) =>
        admin.ListSubmissionsAsync(status ?? "pending", page, ct);

    [HttpPost("submissions/{id:guid}/decision")]
    [Authorize(Policy = Policies.Moderation)]
    public async Task<IActionResult> DecideSubmission(Guid id, ModerationDecisionRequest request, CancellationToken ct)
    {
        var appId = await admin.DecideSubmissionAsync(current.RequireUserId(), id, request.Decision, request.Note, ct);
        return Ok(new { applicationId = appId });
    }

    // ----- Alternative relationships -----

    [HttpGet("alternatives")]
    [Authorize(Policy = Policies.Moderation)]
    public Task<IReadOnlyList<AdminRelationshipRow>> Alternatives([FromQuery] string? status, CancellationToken ct) =>
        admin.ListRelationshipsAsync(status, ct);

    [HttpPost("alternatives/{id:guid}/decision")]
    [Authorize(Policy = Policies.Moderation)]
    public async Task<IActionResult> DecideAlternative(Guid id, ModerationDecisionRequest request, CancellationToken ct)
    {
        await admin.DecideRelationshipAsync(current.RequireUserId(), id, request.Decision, ct);
        return NoContent();
    }

    // ----- Reviews -----

    [HttpGet("reviews")]
    [Authorize(Policy = Policies.Moderation)]
    public Task<IReadOnlyList<AdminReviewRow>> Reviews([FromQuery] string? status, CancellationToken ct) =>
        admin.ListReviewsAsync(status, ct);

    [HttpPost("reviews/{id:guid}/status")]
    [Authorize(Policy = Policies.Moderation)]
    public async Task<IActionResult> SetReviewStatus(Guid id, ModerationDecisionRequest request, CancellationToken ct)
    {
        await admin.SetReviewStatusAsync(current.RequireUserId(), id, request.Decision, ct);
        return NoContent();
    }

    // ----- Reports -----

    [HttpGet("reports")]
    [Authorize(Policy = Policies.Moderation)]
    public Task<IReadOnlyList<AdminReportRow>> Reports(CancellationToken ct) => admin.ListReportsAsync(ct);

    [HttpPost("reports/{id:guid}/decision")]
    [Authorize(Policy = Policies.Moderation)]
    public async Task<IActionResult> ResolveReport(Guid id, ModerationDecisionRequest request, CancellationToken ct)
    {
        await admin.ResolveReportAsync(current.RequireUserId(), id, request.Decision, ct);
        return NoContent();
    }

    // ----- Redirects (admins) -----

    [HttpPost("redirects")]
    [Authorize(Policy = Policies.Administration)]
    public async Task<IActionResult> CreateRedirect(CreateRedirectRequest request, CancellationToken ct)
    {
        await admin.CreateRedirectAsync(current.RequireUserId(), request, ct);
        return NoContent();
    }
}

public sealed record AssignRoleRequest(string Email, string Role, bool Grant);

[ApiController]
[Route("api/v1/admin/users")]
[Produces("application/json")]
[Authorize(Policy = Policies.SuperAdmin)]
public sealed class AdminUsersController(UserManager<AppUser> users) : ControllerBase
{
    [HttpPost("roles")]
    public async Task<IActionResult> AssignRole(AssignRoleRequest request)
    {
        if (!Roles.All.Contains(request.Role))
        {
            throw new BadRequestException("Unknown role.");
        }

        var user = await users.FindByEmailAsync(request.Email) ?? throw new NotFoundException("User", request.Email);
        var result = request.Grant
            ? await users.AddToRoleAsync(user, request.Role)
            : await users.RemoveFromRoleAsync(user, request.Role);
        return result.Succeeded ? NoContent() : Problem(string.Join("; ", result.Errors.Select(e => e.Description)), statusCode: 400);
    }
}

// ----- Admin panel: analytics, application detail, categories, users -----

[ApiController]
[Route("api/v1/admin")]
[Produces("application/json")]
[Authorize(Policy = Policies.Staff)]
public sealed class AdminPanelController(PanelService panel, HttpCurrentUser current, IConfiguration config) : ControllerBase
{
    [HttpGet("analytics")]
    public Task<AnalyticsDto> Analytics([FromQuery] int? days, CancellationToken ct)
    {
        var siteUrl = config["Site:Url"];
        var host = Uri.TryCreate(siteUrl, UriKind.Absolute, out var u) ? u.Host : null;
        return panel.AnalyticsAsync(days ?? 30, host, ct);
    }

    [HttpGet("applications/{id:guid}")]
    [Authorize(Policy = Policies.Editorial)]
    public Task<AdminApplicationDetail> Application(Guid id, CancellationToken ct) => panel.GetApplicationAsync(id, ct);

    [HttpGet("categories")]
    public Task<IReadOnlyList<AdminCategoryRow>> Categories(CancellationToken ct) => panel.ListCategoriesAsync(ct);

    [HttpPost("categories")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> CreateCategory(UpsertCategoryRequest request, CancellationToken ct)
    {
        var id = await panel.UpsertCategoryAsync(current.RequireUserId(), null, request, ct);
        return StatusCode(StatusCodes.Status201Created, new { id });
    }

    [HttpPut("categories/{id:guid}")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> UpdateCategory(Guid id, UpsertCategoryRequest request, CancellationToken ct)
    {
        await panel.UpsertCategoryAsync(current.RequireUserId(), id, request, ct);
        return NoContent();
    }

    [HttpDelete("categories/{id:guid}")]
    [Authorize(Policy = Policies.Editorial)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await panel.DeleteCategoryAsync(current.RequireUserId(), id, ct);
        return NoContent();
    }
}

public sealed record AdminUserRow(
    Guid Id,
    string Email,
    string? DisplayName,
    IReadOnlyList<string> Roles,
    bool EmailConfirmed,
    bool Locked,
    DateTimeOffset CreatedAt);

public sealed record SetRolesRequest(string[] Roles);

[ApiController]
[Route("api/v1/admin/members")]
[Produces("application/json")]
[Authorize(Policy = Policies.Administration)]
public sealed class AdminMembersController(UserManager<AppUser> users, HttpCurrentUser current) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<AdminUserRow>> List([FromQuery] string? q, [FromQuery] int? page, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, 50);
        var query = users.Users;
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToUpperInvariant();
            query = query.Where(u => u.NormalizedEmail!.Contains(term) || (u.DisplayName != null && u.DisplayName.ToUpper().Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var page1 = await query.OrderByDescending(u => u.CreatedAt).Skip((p - 1) * size).Take(size).ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        var rows = new List<AdminUserRow>(page1.Count);
        foreach (var u in page1)
        {
            rows.Add(new AdminUserRow(u.Id, u.Email ?? string.Empty, u.DisplayName, (await users.GetRolesAsync(u)).ToList(),
                u.EmailConfirmed, u.LockoutEnd is { } end && end > now, u.CreatedAt));
        }

        return new PagedResult<AdminUserRow>(rows, p, size, total);
    }

    /// <summary>Replaces a member's roles. Only a SuperAdmin can grant or revoke staff roles.</summary>
    [HttpPut("{id:guid}/roles")]
    [Authorize(Policy = Policies.SuperAdmin)]
    public async Task<IActionResult> SetRoles(Guid id, SetRolesRequest request)
    {
        if (request.Roles.Any(r => !Roles.All.Contains(r)))
        {
            throw new BadRequestException("Unknown role.");
        }

        var user = await users.FindByIdAsync(id.ToString()) ?? throw new NotFoundException("User", id.ToString());
        if (user.Id == current.RequireUserId() && !request.Roles.Contains(Roles.SuperAdmin))
        {
            throw new BadRequestException("You cannot remove your own SuperAdmin role.");
        }

        var existing = await users.GetRolesAsync(user);
        var remove = await users.RemoveFromRolesAsync(user, existing.Except(request.Roles));
        var add = await users.AddToRolesAsync(user, request.Roles.Except(existing));
        return remove.Succeeded && add.Succeeded ? NoContent() : Problem("Roles could not be updated.", statusCode: 400);
    }

    /// <summary>Blocks or unblocks sign-in for a member.</summary>
    [HttpPost("{id:guid}/lock")]
    public async Task<IActionResult> SetLock(Guid id, [FromQuery] bool locked)
    {
        var user = await users.FindByIdAsync(id.ToString()) ?? throw new NotFoundException("User", id.ToString());
        if (user.Id == current.RequireUserId())
        {
            throw new BadRequestException("You cannot block your own account.");
        }

        await users.SetLockoutEnabledAsync(user, true);
        await users.SetLockoutEndDateAsync(user, locked ? DateTimeOffset.MaxValue : null);
        if (locked)
        {
            await users.UpdateSecurityStampAsync(user);
        }

        return NoContent();
    }
}

[ApiController]
[Route("api/v1/admin/imports")]
[Produces("application/json")]
[Authorize(Policy = Policies.Editorial)]
public sealed class AdminImportsController(ImportService imports, AdminService admin, HttpCurrentUser current) : ControllerBase
{
    [HttpGet]
    public Task<ImportOverview> List([FromQuery] string? status, [FromQuery] int? page, CancellationToken ct) =>
        imports.ListAsync(status, page, ct);

    [HttpPost]
    public Task<QueueImportResult> Queue(QueueImportRequest request, CancellationToken ct) =>
        imports.QueueAsync(current.RequireUserId(), request, ct);

    /// <summary>scope: failed (retry failures) | all (re-sync every finished import from its website).</summary>
    [HttpPost("requeue")]
    public async Task<object> Requeue([FromQuery] string? scope, CancellationToken ct) =>
        new { count = await imports.RequeueAsync(scope == "all" ? "all" : "failed", ct) };

    [HttpPost("{id:guid}/requeue")]
    public async Task<IActionResult> RequeueOne(Guid id, CancellationToken ct)
    {
        await imports.RequeueOneAsync(id, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await imports.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Publishes every draft created by a finished import.</summary>
    [HttpPost("publish-drafts")]
    public async Task<object> PublishDrafts(CancellationToken ct)
    {
        var ids = await imports.DraftIdsAsync(ct);
        foreach (var id in ids)
        {
            await admin.SetApplicationStatusAsync(current.RequireUserId(), id, "publish", ct);
        }

        return new { count = ids.Count };
    }
}

[ApiController]
[Route("api/v1/admin/content")]
[Produces("application/json")]
[Authorize(Policy = Policies.Editorial)]
public sealed class AdminContentController(
    ContentService content,
    Discovery.Infrastructure.Content.ContentGenerator generator,
    HttpCurrentUser current) : ControllerBase
{
    [HttpGet("status")]
    public object Status() => new { configured = generator.IsConfigured, model = generator.Model };

    [HttpGet]
    public Task<ContentOverview> List([FromQuery] string? status, [FromQuery] string? q, [FromQuery] int? page, CancellationToken ct) =>
        content.ListAsync(status, q, page, ct);

    [HttpGet("{id:guid}")]
    public Task<ContentDraftDetail> Get(Guid id, CancellationToken ct) => content.GetAsync(id, ct);

    [HttpPost("queue")]
    public async Task<object> Queue(QueueContentRequest request, CancellationToken ct) =>
        new { count = await content.QueueAsync(current.RequireUserId(), request, ct) };

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, ApproveContentRequest request, CancellationToken ct)
    {
        await content.ApproveAsync(current.RequireUserId(), id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        await content.RejectAsync(current.RequireUserId(), id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/regenerate")]
    public async Task<object> Regenerate(Guid id, CancellationToken ct) => new { count = await content.RequeueAsync(id, ct) };

    [HttpPost("retry-failed")]
    public async Task<object> RetryFailed(CancellationToken ct) => new { count = await content.RequeueAsync(null, ct) };

    [HttpPost("cancel-queued")]
    public async Task<object> CancelQueued(CancellationToken ct) => new { count = await content.CancelQueuedAsync(ct) };
}
