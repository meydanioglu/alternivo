using Discovery.Api.Infrastructure;
using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Application.Contracts;
using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

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
    [RequireConfirmedEmail]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<ActionResult<ReviewDto>> CreateReview(Guid id, CreateReviewRequest request, CancellationToken ct)
    {
        var review = await community.CreateReviewAsync(user.RequireUserId(), id, request, ct);
        return StatusCode(StatusCodes.Status201Created, review);
    }

    /// <summary>Suggest that {alternativeSlug} is an alternative to {slug}. Goes to moderation.</summary>
    [HttpPost("{slug}/alternatives")]
    [RequireConfirmedEmail]
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
    [RequireConfirmedEmail]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public Task<ReviewDto> Update(Guid id, UpdateReviewRequest request, CancellationToken ct) =>
        community.UpdateReviewAsync(user.RequireUserId(), id, request, ct);
}

[ApiController]
[Route("api/v1/submissions")]
[Produces("application/json")]
[Authorize]
[RequireConfirmedEmail]
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
[RequireConfirmedEmail]
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

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? Bio,
    string? Username = null,
    string? Website = null,
    string? Twitter = null,
    string? GitHub = null,
    string? LinkedIn = null,
    bool? IsProfilePublic = null,
    bool? ShowLikes = null);

public sealed record MeDto(
    Guid Id,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles,
    bool EmailConfirmed,
    string? Username,
    string? Bio,
    string? AvatarUrl,
    string? Website,
    string? Twitter,
    string? GitHub,
    string? LinkedIn,
    bool IsProfilePublic,
    bool ShowLikes,
    DateTimeOffset CreatedAt);

[ApiController]
[Route("api/v1/users")]
[Produces("application/json")]
[Authorize]
public sealed partial class UsersController(
    UserManager<AppUser> users,
    CommunityService community,
    HttpCurrentUser current,
    IConfiguration config) : ControllerBase
{
    private static readonly string[] ReservedUsernames = ["admin", "root", "support", "alternivo", "me", "settings", "moderator", "staff"];

    private static readonly Dictionary<string, string> ImageTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/gif"] = ".gif",
        ["image/webp"] = ".webp",
    };

    [GeneratedRegex("^[a-z0-9_-]{3,30}$")]
    private static partial Regex UsernamePattern();

    private async Task<AppUser> RequireUserAsync() =>
        await users.FindByIdAsync(current.RequireUserId().ToString()) ?? throw new ForbiddenException("Authentication is required.");

    [HttpGet("me")]
    public async Task<MeDto> Me()
    {
        var u = await RequireUserAsync();
        var roles = await users.GetRolesAsync(u);
        return new MeDto(u.Id, u.Email ?? string.Empty, u.DisplayName ?? "Community member", roles.ToList(), u.EmailConfirmed,
            u.Handle, u.Bio, u.AvatarUrl, u.Website, u.Twitter, u.GitHub, u.LinkedIn, u.IsProfilePublic, u.ShowLikes, u.CreatedAt);
    }

    [AllowAnonymous]
    [HttpGet("username-available")]
    public async Task<object> UsernameAvailable([FromQuery] string? u)
    {
        var name = (u ?? string.Empty).Trim().ToLowerInvariant();
        if (!UsernamePattern().IsMatch(name) || ReservedUsernames.Contains(name))
        {
            return new { available = false, reason = "invalid" };
        }

        var me = current.UserId;
        var taken = await users.Users.AnyAsync(x => x.Handle == name && x.Id != me);
        return new { available = !taken, reason = taken ? "taken" : null };
    }

    [HttpPatch("me")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request)
    {
        var user = await RequireUserAsync();

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

        if (request.Username is { } username)
        {
            username = username.Trim().ToLowerInvariant();
            if (username.Length == 0)
            {
                user.Handle = null;
            }
            else
            {
                if (!UsernamePattern().IsMatch(username) || ReservedUsernames.Contains(username))
                {
                    throw new BadRequestException("Username must be 3-30 characters: lowercase letters, numbers, - or _.");
                }

                if (await users.Users.AnyAsync(x => x.Handle == username && x.Id != user.Id))
                {
                    throw new ConflictException("This username is already taken.");
                }

                user.Handle = username;
            }
        }

        user.Website = CleanLink(request.Website, user.Website, "Website");
        user.Twitter = CleanLink(request.Twitter, user.Twitter, "X / Twitter");
        user.GitHub = CleanLink(request.GitHub, user.GitHub, "GitHub");
        user.LinkedIn = CleanLink(request.LinkedIn, user.LinkedIn, "LinkedIn");
        if (request.IsProfilePublic is { } isPublic) user.IsProfilePublic = isPublic;
        if (request.ShowLikes is { } showLikes) user.ShowLikes = showLikes;

        var result = await users.UpdateAsync(user);
        return result.Succeeded ? NoContent() : Problem(string.Join("; ", result.Errors.Select(e => e.Description)), statusCode: 400);
    }

    /// <summary>null keeps the current value, "" clears it, anything else must be a public http(s) URL.</summary>
    private static string? CleanLink(string? value, string? currentValue, string label)
    {
        if (value is null) return currentValue;
        value = value.Trim();
        if (value.Length == 0) return null;
        if (value.Length > 200 || !UrlSafety.IsSafePublicWebUrl(value))
        {
            throw new BadRequestException($"{label} must be a full https:// link.");
        }

        return value;
    }

    [HttpPost("me/avatar")]
    [EnableRateLimiting(Policies.WritesRateLimit)]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<object> UploadAvatar(IFormFile file, CancellationToken ct)
    {
        if (file.Length is 0 or > 1024 * 1024)
        {
            throw new BadRequestException("Avatar must be an image up to 1 MB.");
        }

        if (!ImageTypes.TryGetValue(file.ContentType, out var ext) || !await LooksLikeImageAsync(file, ct))
        {
            throw new BadRequestException("Use a JPG, PNG, GIF or WebP image.");
        }

        var user = await RequireUserAsync();
        var root = config["Media:Path"] ?? "/app/media";
        var dir = Path.Combine(root, "avatars");
        Directory.CreateDirectory(dir);
        var fileName = $"{user.Id:N}-{Guid.NewGuid():N}"[..44] + ext;
        await using (var stream = System.IO.File.Create(Path.Combine(dir, fileName)))
        {
            await file.CopyToAsync(stream, ct);
        }

        DeleteOwnedAvatar(root, user.AvatarUrl);
        user.AvatarUrl = $"/media/avatars/{fileName}";
        await users.UpdateAsync(user);
        return new { avatarUrl = user.AvatarUrl };
    }

    [HttpDelete("me/avatar")]
    public async Task<IActionResult> RemoveAvatar()
    {
        var user = await RequireUserAsync();
        DeleteOwnedAvatar(config["Media:Path"] ?? "/app/media", user.AvatarUrl);
        user.AvatarUrl = null;
        await users.UpdateAsync(user);
        return NoContent();
    }

    private static void DeleteOwnedAvatar(string root, string? url)
    {
        if (url is null || !url.StartsWith("/media/avatars/")) return;
        var full = Path.GetFullPath(Path.Combine(root, "avatars", Path.GetFileName(url)));
        if (full.StartsWith(Path.GetFullPath(root)) && System.IO.File.Exists(full)) System.IO.File.Delete(full);
    }

    /// <summary>Checks the file signature so a renamed non-image is never stored.</summary>
    private static async Task<bool> LooksLikeImageAsync(IFormFile file, CancellationToken ct)
    {
        var head = new byte[12];
        await using var s = file.OpenReadStream();
        var read = await s.ReadAsync(head, ct);
        if (read < 4) return false;
        return (head[0] == 0xFF && head[1] == 0xD8)
            || (head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47)
            || (head[0] == 0x47 && head[1] == 0x49 && head[2] == 0x46)
            || (read >= 12 && head[0] == 0x52 && head[1] == 0x49 && head[8] == 0x57 && head[9] == 0x45);
    }

    [HttpGet("me/bookmarks")]
    public Task<IReadOnlyList<ApplicationSummaryDto>> Bookmarks(CancellationToken ct) =>
        community.GetBookmarksAsync(current.RequireUserId(), ct);

    [HttpGet("me/submissions")]
    public Task<IReadOnlyList<object>> Submissions(CancellationToken ct) =>
        community.GetMySubmissionsAsync(current.RequireUserId(), ct);
}

public sealed record PublicProfileDto(
    string Username,
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    string? Website,
    string? Twitter,
    string? GitHub,
    string? LinkedIn,
    DateTimeOffset JoinedAt,
    bool ShowLikes,
    UserActivityDto Activity);

[ApiController]
[Route("api/v1/profiles")]
[Produces("application/json")]
public sealed class ProfilesController(UserManager<AppUser> users, CommunityService community, HttpCurrentUser current) : ControllerBase
{
    /// <summary>Public profile by username. Private profiles are visible only to their owner.</summary>
    [HttpGet("{username}")]
    public async Task<ActionResult<PublicProfileDto>> Get(string username, CancellationToken ct)
    {
        var name = username.Trim().ToLowerInvariant();
        var u = await users.Users.FirstOrDefaultAsync(x => x.Handle == name, ct);
        if (u is null || (!u.IsProfilePublic && u.Id != current.UserId))
        {
            return NotFound();
        }

        var display = u.DisplayName ?? "Community member";
        var activity = await community.GetUserActivityAsync(u.Id, display, u.ShowLikes, ct);
        return new PublicProfileDto(u.Handle!, display, u.Bio, u.AvatarUrl, u.Website, u.Twitter, u.GitHub, u.LinkedIn,
            u.CreatedAt, u.ShowLikes, activity);
    }
}
