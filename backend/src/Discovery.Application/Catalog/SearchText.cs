using Discovery.Domain.Catalog;

namespace Discovery.Application.Catalog;

/// <summary>Builds the denormalised search document stored on each application.</summary>
public static class SearchText
{
    public static string Build(
        SoftwareApplication app,
        IEnumerable<string> aliases,
        IEnumerable<string> categoryNames,
        IEnumerable<string> tagNames,
        IEnumerable<string> featureNames)
    {
        var parts = new List<string> { app.Name };
        parts.AddRange(aliases);
        if (!string.IsNullOrWhiteSpace(app.Developer))
        {
            parts.Add(app.Developer);
        }

        parts.AddRange(categoryNames);
        parts.AddRange(tagNames);
        parts.AddRange(featureNames);
        var text = string.Join(' ', parts.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase));
        return text.Length > 4000 ? text[..4000] : text;
    }
}
