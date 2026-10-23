using Discovery.Api.Infrastructure;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Application.Contracts;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Discovery.Api.Controllers;

/// <summary>Write endpoints for application-level community actions. Anonymous callers receive 401.</summary>
[ApiController]
[Route("api/v1/applications")]
[Produces("application/json")]
[Authorize]
public sealed class ApplicationCommunityController(CommunityService community, HttpCurrentUser user) : ControllerBase
{
    [HttpGet("{id:guid}/votes")]
    public Task<VoteStateDto> GetVote(Guid id, CancellationToken ct) =>
        community.GetApplicationVoteAsync(user.RequireUserId(), id, ct);

    [HttpPut("{id:guid}/votes")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<VoteStateDto> Like(Guid id, CancellationToken ct) =>
        community.SetApplicationVoteAsync(user.RequireUserId(), id, true, ct);

    [HttpDelete("{id:guid}/votes")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<VoteStateDto> Unlike(Guid id, CancellationToken ct) =>
        community.SetApplicationVoteAsync(user.RequireUserId(), id, false, ct);

    [HttpPut("{id:guid}/bookmark")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Save(Guid id, CancellationToken ct)
    {
        await community.SetBookmarkAsync(user.RequireUserId(), id, true, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}/bookmark")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Unsave(Guid id, CancellationToken ct)
    {
        await community.SetBookmarkAsync(user.RequireUserId(), id, false, ct);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}/reviews")]
    public Task<PagedResult<ReviewDto>> Reviews(Guid id, [FromQuery] int? page, CancellationToken ct) =>
        community.GetReviewsAsync(id, page, ct);

    [HttpPost("{id:guid}/reviews")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<ActionResult<ReviewDto>> CreateReview(Guid id, CreateReviewRequest request, CancellationToken ct)
    {
        var review = await community.CreateReviewAsync(user.RequireUserId(), id, request, ct);
        return StatusCode(StatusCodes.Status201Created, review);
    }

    /// <summary>Suggest that {alternativeSlug} is an alternative to {slug}. Goes to moderation.</summary>
    [HttpPost("{slug}/alternatives")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> SuggestAlternative(string slug, SuggestAlternativeRequest request, CancellationToken ct)
    {
        var id = await community.SuggestAlternativeAsync(user.RequireUserId(), slug, request, ct);
        return Accepted(new { id });
    }
}

[ApiController]
[Route("api/v1/alternatives")]
[Produces("application/json")]
[Authorize]
public sealed class AlternativesController(CommunityService community, HttpCurrentUser user) : ControllerBase
{
    [HttpPut("{id:guid}/votes")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<VoteStateDto> Vote(Guid id, CancellationToken ct) =>
        community.SetAlternativeVoteAsync(user.RequireUserId(), id, true, ct);

    [HttpDelete("{id:guid}/votes")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<VoteStateDto> Unvote(Guid id, CancellationToken ct) =>
        community.SetAlternativeVoteAsync(user.RequireUserId(), id, false, ct);
}

[ApiController]
[Route("api/v1/reviews")]
[Produces("application/json")]
[Authorize]
public sealed class ReviewsController(CommunityService community, HttpCurrentUser user) : ControllerBase
{
    [HttpPut("{id:guid}")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<ReviewDto> Update(Guid id, UpdateReviewRequest request, CancellationToken ct) =>
        community.UpdateReviewAsync(user.RequireUserId(), id, request, ct);
}

[ApiController]
[Route("api/v1/submissions")]
[Produces("application/json")]
[Authorize]
public sealed class SubmissionsController(CommunityService community, HttpCurrentUser user) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Create(CreateSubmissionRequest request, CancellationToken ct)
    {
        var id = await community.CreateSubmissionAsync(user.RequireUserId(), request, ct);
        return Accepted(new { id, status = "pending" });
    }
}

[ApiController]
[Route("api/v1/reports")]
[Produces("application/json")]
[Authorize]
public sealed class ReportsController(CommunityService community, HttpCurrentUser user) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> Create(CreateReportRequest request, CancellationToken ct)
    {
        var id = await community.CreateReportAsync(user.RequireUserId(), request, ct);
        return Accepted(new { id });
    }
}

public sealed record UpdateProfileRequest(string? DisplayName, string? Bio);

[ApiController]
[Route("api/v1/users")]
[Produces("application/json")]
[Authorize]
public sealed class UsersController(UserManager<AppUser> users, CommunityService community, HttpCurrentUser current) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> Me()
    {
        var user = await users.FindByIdAsync(current.RequireUserId().ToString());
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await users.GetRolesAsync(user);
        return new UserProfileDto(user.Id, user.Email ?? string.Empty, user.DisplayName ?? "Community member", roles.ToList(), user.EmailConfirmed);
    }

    [HttpPatch("me")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request)
    {
        var user = await users.FindByIdAsync(current.RequireUserId().ToString());
        if (user is null)
        {
            return Unauthorized();
        }

        if (request.DisplayName is { } name)
        {
            name = name.Trim();
            if (name.Length is < 2 or > 60)
            {
                throw new BadRequestException("Display name must be 2–60 characters.");
            }

            user.DisplayName = name;
        }

        if (request.Bio is { } bio)
        {
            if (bio.Length > 500)
            {
                throw new BadRequestException("Bio must be at most 500 characters.");
            }

            user.Bio = bio.Trim();
        }

        var result = await users.UpdateAsync(user);
        return result.Succeeded ? NoContent() : Problem(string.Join("; ", result.Errors.Select(e => e.Description)), statusCode: 400);
    }

    [HttpGet("me/bookmarks")]
    public Task<IReadOnlyList<ApplicationSummaryDto>> Bookmarks(CancellationToken ct) =>
        community.GetBookmarksAsync(current.RequireUserId(), ct);

    [HttpGet("me/submissions")]
    public Task<IReadOnlyList<object>> Submissions(CancellationToken ct) =>
        community.GetMySubmissionsAsync(current.RequireUserId(), ct);
}
