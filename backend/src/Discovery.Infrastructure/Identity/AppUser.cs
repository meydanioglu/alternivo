using Microsoft.AspNetCore.Identity;

namespace Discovery.Infrastructure.Identity;

public class AppUser : IdentityUser<Guid>
{
    public AppUser()
    {
        Id = Guid.CreateVersion7();
        SecurityStamp = Guid.NewGuid().ToString();
    }

    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    /// <summary>Public handle for /u/{username}; lowercase, unique.</summary>
    // Not "Username": that differs from IdentityUser.UserName only by case and EF maps them onto one column.
    public string? Handle { get; set; }
    public string? Website { get; set; }
    public string? Twitter { get; set; }
    public string? GitHub { get; set; }
    public string? LinkedIn { get; set; }
    public bool IsProfilePublic { get; set; } = true;
    public bool ShowLikes { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public static class Roles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Editor = "Editor";
    public const string Moderator = "Moderator";
    public const string Member = "Member";

    public static readonly string[] All = [SuperAdmin, Admin, Editor, Moderator, Member];
}
