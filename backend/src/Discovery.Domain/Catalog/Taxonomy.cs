using Discovery.Domain.Common;

namespace Discovery.Domain.Catalog;

public class Platform : Entity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public PlatformKind Kind { get; set; }
    public int SortOrder { get; set; }
}

public class License : Entity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    /// <summary>True only for OSI-approved licenses.</summary>
    public bool IsOpenSource { get; set; }
    /// <summary>Filter family used by the public license facet: gpl, mit, apache, proprietary, other.</summary>
    public required string Family { get; set; }
    public string? SpdxId { get; set; }
}

public class Category : Entity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    /// <summary>Editor-written introduction shown at the top of the category page.</summary>
    public string? SeoIntro { get; set; }
    public Guid? ParentId { get; set; }
    public Category? Parent { get; set; }
    public List<Category> Children { get; set; } = [];
    public int SortOrder { get; set; }
    public bool IsFeatured { get; set; }
    /// <summary>Lucide icon name rendered by the frontend.</summary>
    public string? Icon { get; set; }
    public List<ApplicationCategory> Applications { get; set; } = [];
}

public class Feature : Entity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
}

public class Tag : Entity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
}
