namespace Discovery.Application.Common;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public static class Paging
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 50;

    public static (int Page, int PageSize) Normalize(int? page, int? pageSize)
    {
        var p = page is null or < 1 ? 1 : Math.Min(page.Value, 10_000);
        var s = pageSize is null or < 1 ? DefaultPageSize : Math.Min(pageSize.Value, MaxPageSize);
        return (p, s);
    }
}

/// <summary>Reads and writes the approved content sections stored as JSON on an application.</summary>
public static class ContentJson
{
    private static readonly System.Text.Json.JsonSerializerOptions Options = new(System.Text.Json.JsonSerializerDefaults.Web);

    public static Contracts.ContentSectionsDto? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<Contracts.ContentSectionsDto>(json, Options);
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }
    }

    public static string Serialize(Contracts.ContentSectionsDto sections) => System.Text.Json.JsonSerializer.Serialize(sections, Options);
}
