using Discovery.Api.Infrastructure;
using Discovery.Application.Admin;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

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
