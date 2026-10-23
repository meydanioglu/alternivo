namespace Discovery.Application.Catalog;

public sealed class CatalogOptions
{
    public const string SectionName = "Catalog";

    /// <summary>Include records flagged IsDemoData in public queries. Must be false in production.</summary>
    public bool ShowDemoData { get; set; }

    public int HomeCacheSeconds { get; set; } = 300;
    public int DetailCacheSeconds { get; set; } = 120;
    public int TaxonomyCacheSeconds { get; set; } = 900;

    /// <summary>A search query must be seen this many times in 30 days to appear as "popular".</summary>
    public int PopularSearchMinCount { get; set; } = 3;
}
