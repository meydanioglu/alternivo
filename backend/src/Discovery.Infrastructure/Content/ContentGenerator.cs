using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain.Operations;
using Discovery.Infrastructure.Importing;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Discovery.Infrastructure.Content;

/// <summary>
/// Drafts SEO content for one application with the OpenAI API. Facts come only from text on the product's own
/// website (fetched politely, robots.txt honoured) plus the catalogue data we already hold; the model is told to
/// leave out anything the source does not support. The result is stored as a draft for an editor to review.
/// </summary>
public sealed partial class ContentGenerator(AppDbContext db, IHttpClientFactory httpFactory, IConfiguration config)
{
    public const string OpenAiClientName = "openai";
    private const int MaxSourceChars = 14_000;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
    private string? ApiKey => config["OpenAI:ApiKey"];
    public string Model => string.IsNullOrWhiteSpace(config["OpenAI:Model"]) ? "gpt-5" : config["OpenAI:Model"]!;

    private const string Instructions = """
        You are a senior software editor writing product pages for Alternivo, a site that helps people compare
        software and find alternatives. Write in clear, natural, specific English for people evaluating the product.

        Rules:
        - Use ONLY facts found in SOURCE or CATALOGUE. Never invent features, prices, numbers, customers, awards,
          integrations, release dates or comparisons. If the source does not support a field, return an empty list
          or the shortest honest text; never pad.
        - No marketing hype ("revolutionary", "best-in-class", "seamless", "cutting-edge", "game-changer").
          Describe what it does and for whom, concretely.
        - Do not copy sentences from SOURCE; rephrase in your own words.
        - Do not mention Alternivo, AI, or that this text was generated. Do not address the reader as "you" more than needed.
        - shortDescription: one sentence, 90-180 characters, what the product is and does.
        - description: 3-5 short paragraphs (220-450 words total) separated by blank lines: what it is, main
          capabilities, typical workflows, who it suits, notable limits only if the source states them.
        - seoTitle: max 60 characters, include the product name and its main purpose.
        - seoDescription: 130-160 characters, includes the product name, describes value plainly.
        - features: 3-8 items, each a short name plus one sentence.
        - useCases and audience: 2-6 short items each.
        - pros and cons: 2-5 items each, only when grounded in SOURCE; cons may be [] when the source gives no basis.
        - faq: 3-5 questions people actually search (e.g. what it is used for, who it is for, main capabilities,
          platforms if known). Answers 1-3 sentences, factual.
        """;

    public async Task GenerateAsync(ContentDraft draft, CancellationToken ct)
    {
        if (!IsConfigured) throw new ImportException("OpenAI API key is not configured (OPENAI_API_KEY).");

        var app = await db.Applications
            .Include(a => a.License)
            .Include(a => a.Platforms).ThenInclude(p => p.Platform)
            .Include(a => a.Categories).ThenInclude(c => c.Category)
            .AsSplitQuery()
            .FirstOrDefaultAsync(a => a.Id == draft.ApplicationId && a.DeletedAt == null, ct)
            ?? throw new ImportException("Application no longer exists.");

        var (sourceUrl, source) = app.WebsiteUrl is { } url ? await FetchSourceTextAsync(url, ct) : (null, "");
        var catalogue = new StringBuilder()
            .AppendLine($"Name: {app.Name}")
            .AppendLine($"Current short description: {app.ShortDescription}")
            .AppendLine($"Categories: {string.Join(", ", app.Categories.Where(c => c.Category != null).Select(c => c.Category!.Name))}")
            .AppendLine($"Platforms: {string.Join(", ", app.Platforms.Where(p => p.Platform != null).Select(p => p.Platform!.Name))}")
            .AppendLine($"Pricing: {string.Join(", ", PricingNames.ToNames(app.Pricing))}")
            .AppendLine($"License: {app.License?.Name ?? "unknown"}")
            .AppendLine($"Developer: {app.Developer ?? "unknown"}")
            .AppendLine($"Website: {app.WebsiteUrl}")
            .ToString();

        var user = $"""
            CATALOGUE (trusted data we hold):
            {catalogue}
            SOURCE (text from the product's official website{(source.Length == 0 ? " — unavailable; stay minimal and general" : "")}):
            <<<
            {source}
            >>>
            Write the product page content for {app.Name}.
            """;

        var body = new JsonObject
        {
            ["model"] = Model,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = Instructions },
                new JsonObject { ["role"] = "user", ["content"] = user },
            },
            ["response_format"] = new JsonObject
            {
                ["type"] = "json_schema",
                ["json_schema"] = new JsonObject { ["name"] = "product_content", ["strict"] = true, ["schema"] = Schema() },
            },
        };

        var http = httpFactory.CreateClient(OpenAiClientName);
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ApiKey);
        using var response = await http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            var message = JsonNode.Parse(json)?["error"]?["message"]?.GetValue<string>() ?? json;
            throw response.StatusCode is HttpStatusCode.TooManyRequests or >= HttpStatusCode.InternalServerError
                ? new HttpRequestException($"OpenAI {(int)response.StatusCode}: {Truncate(message, 300)}")
                : new ImportException($"OpenAI {(int)response.StatusCode}: {Truncate(message, 300)}");
        }

        var root = JsonNode.Parse(json)!;
        var choice = root["choices"]![0]!;
        if (choice["message"]?["refusal"]?.GetValue<string>() is { Length: > 0 } refusal)
        {
            throw new ImportException($"Model declined: {Truncate(refusal, 300)}");
        }

        if (choice["finish_reason"]?.GetValue<string>() == "length")
        {
            throw new ImportException("Output was cut off (length limit).");
        }

        var content = choice["message"]!["content"]!.GetValue<string>();
        var parsed = JsonSerializer.Deserialize<Generated>(content, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new ImportException("Empty response from the model.");

        draft.ShortDescription = Truncate(parsed.ShortDescription.Trim(), 200);
        draft.Description = Truncate(parsed.Description.Trim(), 10_000);
        draft.SeoTitle = Truncate(parsed.SeoTitle.Trim(), 70);
        draft.SeoDescription = Truncate(parsed.SeoDescription.Trim(), 170);
        draft.SectionsJson = ContentJson.Serialize(new ContentSectionsDto(
            parsed.Features.Select(f => new ContentFeatureDto(f.Name.Trim(), f.Description.Trim())).ToList(),
            Clean(parsed.UseCases), Clean(parsed.Audience), Clean(parsed.Pros), Clean(parsed.Cons),
            parsed.Faq.Select(f => new ContentFaqDto(f.Question.Trim(), f.Answer.Trim())).ToList()));
        draft.SourceUrl = sourceUrl;
        draft.SourceChars = source.Length;
        draft.Model = root["model"]?.GetValue<string>() ?? Model;
        draft.InputTokens = root["usage"]?["prompt_tokens"]?.GetValue<int>() ?? 0;
        draft.OutputTokens = root["usage"]?["completion_tokens"]?.GetValue<int>() ?? 0;
    }

    private static List<string> Clean(IEnumerable<string> items) =>
        items.Select(i => i.Trim()).Where(i => i.Length > 0).Distinct().ToList();

    /// <summary>Readable text of the product's home page (and nothing else), robots.txt permitting.</summary>
    private async Task<(string? Url, string Text)> FetchSourceTextAsync(string url, CancellationToken ct)
    {
        if (!UrlSafety.IsSafePublicWebUrl(url)) return (null, "");
        var http = httpFactory.CreateClient(ProductImporter.HttpClientName);
        try
        {
            var site = new Uri(url);
            using (var robots = await http.GetAsync(new Uri(site, "/robots.txt"), ct))
            {
                if (robots.IsSuccessStatusCode && !ProductImporter.RobotsAllowsRoot(await robots.Content.ReadAsStringAsync(ct)))
                {
                    return (url, "");
                }
            }

            using var response = await http.GetAsync(site, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode) return (url, "");
            var html = await response.Content.ReadAsStringAsync(ct);
            if (html.Length > 2_000_000) html = html[..2_000_000];

            var meta = MetaDescription().Match(html) is { Success: true } m ? WebUtility.HtmlDecode(m.Groups[1].Value) + "\n" : "";
            var text = NonContent().Replace(html, " ");
            text = Tags().Replace(text, "\n");
            text = WebUtility.HtmlDecode(text);
            text = string.Join("\n", text.Split('\n').Select(l => Spaces().Replace(l, " ").Trim()).Where(l => l.Length > 2).Distinct());
            text = meta + text;
            return (response.RequestMessage?.RequestUri?.ToString() ?? url, text.Length > MaxSourceChars ? text[..MaxSourceChars] : text);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or UriFormatException)
        {
            return (url, "");
        }
    }

    private static JsonObject Schema()
    {
        static JsonObject Str() => new() { ["type"] = "string" };
        static JsonObject Arr(JsonNode items) => new() { ["type"] = "array", ["items"] = items };
        static JsonObject Obj(params (string Name, JsonNode Type)[] props)
        {
            var properties = new JsonObject();
            var required = new JsonArray();
            foreach (var (name, type) in props)
            {
                properties[name] = type;
                required.Add(name);
            }

            return new JsonObject { ["type"] = "object", ["properties"] = properties, ["required"] = required, ["additionalProperties"] = false };
        }

        return Obj(
            ("shortDescription", Str()),
            ("description", Str()),
            ("seoTitle", Str()),
            ("seoDescription", Str()),
            ("features", Arr(Obj(("name", Str()), ("description", Str())))),
            ("useCases", Arr(Str())),
            ("audience", Arr(Str())),
            ("pros", Arr(Str())),
            ("cons", Arr(Str())),
            ("faq", Arr(Obj(("question", Str()), ("answer", Str())))));
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..(max - 1)].TrimEnd() + "…";

    private sealed record GeneratedFeature(string Name, string Description);

    private sealed record GeneratedFaq(string Question, string Answer);

    private sealed record Generated(
        string ShortDescription,
        string Description,
        string SeoTitle,
        string SeoDescription,
        List<GeneratedFeature> Features,
        List<string> UseCases,
        List<string> Audience,
        List<string> Pros,
        List<string> Cons,
        List<GeneratedFaq> Faq);

    [GeneratedRegex(@"<meta[^>]+name=[""']description[""'][^>]+content=[""']([^""']{10,500})[""']", RegexOptions.IgnoreCase)]
    private static partial Regex MetaDescription();

    [GeneratedRegex(@"<(script|style|noscript|svg|nav|footer|header|iframe|template)\b[\s\S]*?</\1>|<!--[\s\S]*?-->", RegexOptions.IgnoreCase)]
    private static partial Regex NonContent();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex Tags();

    [GeneratedRegex(@"[ \t\r\f\v ]+")]
    private static partial Regex Spaces();
}
