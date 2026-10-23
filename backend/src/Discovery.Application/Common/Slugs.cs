using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Discovery.Application.Common;

public static partial class Slugs
{
    /// <summary>Allowed public slug shape: lowercase ascii, digits and single hyphens.</summary>
    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();

    public static bool IsValid(string? slug) =>
        !string.IsNullOrEmpty(slug) && slug.Length <= 120 && SlugPattern().IsMatch(slug);

    /// <summary>Creates a URL slug: "Visual Studio Code" → "visual-studio-code", "C++" → "c-plus-plus".</summary>
    public static string Create(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        var text = value.Trim().ToLowerInvariant()
            .Replace("++", " plus plus ")
            .Replace("+", " plus ")
            .Replace("#", " sharp ")
            .Replace("&", " and ");

        var normalized = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        // Turkish dotless i and similar characters that do not decompose.
        var ascii = builder.ToString().Replace('ı', 'i').Replace('ß', 's');
        var slug = NonAlphanumeric().Replace(ascii, "-").Trim('-');
        if (slug.Length > 120)
        {
            slug = slug[..120].TrimEnd('-');
        }

        return slug;
    }
}

/// <summary>Canonical "a-vs-b" comparison slugs: ordering is alphabetical so reversed pairs never duplicate.</summary>
public static class ComparisonSlug
{
    public const string Separator = "-vs-";

    public static string Canonical(IEnumerable<string> slugs)
    {
        var ordered = slugs
            .Select(s => s.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();
        if (ordered.Length < 2)
        {
            throw new BadRequestException("A comparison needs at least two different applications.");
        }

        return string.Join(Separator, ordered);
    }

    /// <summary>Parses "notion-vs-obsidian" into its slugs. Returns null when malformed.</summary>
    public static string[]? Parse(string? pair)
    {
        if (string.IsNullOrWhiteSpace(pair))
        {
            return null;
        }

        var parts = pair.Split(Separator, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length is < 2 or > 4 || parts.Any(p => !Slugs.IsValid(p)))
        {
            return null;
        }

        return parts.Distinct(StringComparer.Ordinal).Count() == parts.Length ? parts : null;
    }
}
