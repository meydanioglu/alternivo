namespace Discovery.Domain.Operations;

/// <summary>Managed redirect for renamed/removed URLs. StatusCode 301, 308 or 410.</summary>
public class SlugRedirect
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string FromPath { get; set; }
    public string? ToPath { get; set; }
    public int StatusCode { get; set; } = 301;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid? UserId { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? DataJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Anonymous search analytics (query text and result count only, no user identifiers).</summary>
public class SearchQueryLog
{
    public long Id { get; set; }
    public required string Query { get; set; }
    public int ResultCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
