namespace Discovery.Domain.Common;

/// <summary>Base type for aggregate roots and entities with a stable UUID key.</summary>
public abstract class Entity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public interface ISoftDeletable
{
    DateTimeOffset? DeletedAt { get; set; }
}
