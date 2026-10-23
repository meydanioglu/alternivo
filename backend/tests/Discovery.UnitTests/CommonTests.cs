using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Infrastructure.Search;

namespace Discovery.UnitTests;

public class SlugTests
{
    [Theory]
    [InlineData("Visual Studio Code", "visual-studio-code")]
    [InlineData("  Notion ", "notion")]
    [InlineData("C++ Builder", "c-plus-plus-builder")]
    [InlineData("Proton Pass!", "proton-pass")]
    [InlineData("Écrire Ça", "ecrire-ca")]
    public void Create_produces_url_safe_slugs(string input, string expected) =>
        Assert.Equal(expected, Slugs.Create(input));

    [Theory]
    [InlineData("notion", true)]
    [InlineData("visual-studio-code", true)]
    [InlineData("Notion", false)]
    [InlineData("a--b", false)]
    [InlineData("-a", false)]
    [InlineData("", false)]
    public void IsValid(string slug, bool expected) => Assert.Equal(expected, Slugs.IsValid(slug));
}

public class ComparisonSlugTests
{
    [Fact]
    public void Reversed_pairs_share_one_canonical_slug()
    {
        Assert.Equal("notion-vs-obsidian", ComparisonSlug.Canonical(["obsidian", "notion"]));
        Assert.Equal(ComparisonSlug.Canonical(["notion", "obsidian"]), ComparisonSlug.Canonical(["obsidian", "notion"]));
    }

    [Fact]
    public void Parse_splits_valid_pairs() =>
        Assert.Equal(new[] { "obsidian", "notion" }, ComparisonSlug.Parse("obsidian-vs-notion"));

    [Theory]
    [InlineData("notion")]
    [InlineData("notion-vs-notion")]
    [InlineData("Notion-vs-obsidian")]
    [InlineData("a-vs-b-vs-c-vs-d-vs-e")]
    [InlineData("")]
    public void Parse_rejects_invalid(string pair) => Assert.Null(ComparisonSlug.Parse(pair));

    [Fact]
    public void Canonical_requires_two_apps() =>
        Assert.Throws<BadRequestException>(() => ComparisonSlug.Canonical(["notion", "notion"]));
}

public class UrlSafetyTests
{
    [Theory]
    [InlineData("https://www.notion.so", true)]
    [InlineData("http://example.com/path?q=1", true)]
    [InlineData("ftp://example.com", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("https://localhost", false)]
    [InlineData("https://127.0.0.1", false)]
    [InlineData("https://10.0.0.5", false)]
    [InlineData("https://192.168.1.1", false)]
    [InlineData("https://169.254.169.254/latest/meta-data", false)]
    [InlineData("https://[::1]/", false)]
    [InlineData("https://user:pass@example.com", false)]
    [InlineData("https://example.com:8443", false)]
    [InlineData("https://intranet", false)]
    [InlineData("https://service.internal", false)]
    [InlineData("https://8.8.8.8", true)]
    public void IsSafePublicWebUrl(string url, bool expected) => Assert.Equal(expected, UrlSafety.IsSafePublicWebUrl(url));

    [Fact]
    public void NormalizedHost_strips_www() => Assert.Equal("notion.so", UrlSafety.NormalizedHost("https://WWW.Notion.so/product"));
}

public class PricingTests
{
    [Fact]
    public void Round_trips_flags()
    {
        var flags = PricingNames.Combine(["freemium", "subscription"]);
        Assert.Equal(PricingModel.Freemium | PricingModel.Subscription, flags);
        Assert.Equal(new[] { "freemium", "subscription" }, PricingNames.ToNames(flags));
    }

    [Fact]
    public void Unknown_names_are_ignored() => Assert.Equal(PricingModel.Free, PricingNames.Combine(["free", "bogus"]));
}

public class CatalogFilterValidatorTests
{
    private readonly CatalogFilterValidator _validator = new();

    [Fact]
    public void Accepts_known_values() =>
        Assert.True(_validator.Validate(new CatalogFilter
        {
            Platform = ["windows", "linux"], Pricing = ["free"], License = ["open-source", "gpl"], Sort = "likes", PageSize = 20,
        }).IsValid);

    [Theory]
    [InlineData("platform")]
    [InlineData("pricing")]
    [InlineData("license")]
    [InlineData("sort")]
    [InlineData("pageSize")]
    public void Rejects_invalid_values(string field)
    {
        var filter = new CatalogFilter();
        switch (field)
        {
            case "platform": filter.Platform = ["<script>"]; break;
            case "pricing": filter.Pricing = ["cheap"]; break;
            case "license": filter.License = ["wtfpl"]; break;
            case "sort": filter.Sort = "random"; break;
            case "pageSize": filter.PageSize = 1000; break;
        }

        Assert.False(_validator.Validate(filter).IsValid);
    }
}

public class ReasonTests
{
    private static SoftwareApplication App(string name, PricingModel pricing, bool openSource, bool selfHost = false) => new()
    {
        Slug = Slugs.Create(name),
        Name = name,
        ShortDescription = name,
        Pricing = pricing,
        IsSelfHostable = selfHost,
        License = new License { Slug = openSource ? "gpl-3-0" : "proprietary", Name = "x", Family = openSource ? "gpl" : "proprietary", IsOpenSource = openSource },
    };

    [Fact]
    public void Reasons_are_derived_only_from_stored_attributes()
    {
        var source = App("Source", PricingModel.Paid | PricingModel.Subscription, openSource: false);
        var alt = App("Alt", PricingModel.Free, openSource: true, selfHost: true);

        var reasons = CatalogService.BuildReasons(source, alt, 0);

        Assert.Contains("Open source", reasons);
        Assert.Contains("Completely free", reasons);
        Assert.Contains("Can be self-hosted", reasons);
        Assert.DoesNotContain(reasons, r => r.StartsWith("Covers", StringComparison.Ordinal));
    }

    [Fact]
    public void No_reasons_when_alternative_offers_nothing_extra()
    {
        var source = App("Source", PricingModel.Free, openSource: true);
        var alt = App("Alt", PricingModel.Free, openSource: true);
        Assert.Empty(CatalogService.BuildReasons(source, alt, 0));
    }
}

public class SearchQueryTests
{
    [Theory]
    [InlineData("photo edit", "photo:* & edit:*")]
    [InlineData("C++ IDE", "c:* & ide:*")]
    [InlineData("'; DROP TABLE x; --", "drop:* & table:* & x:*")]
    [InlineData("!!!", "")]
    public void Prefix_query_contains_only_safe_tokens(string input, string expected) =>
        Assert.Equal(expected, PostgresSearchProvider.BuildPrefixTsQuery(input));

    [Fact]
    public void Like_patterns_are_escaped() =>
        Assert.Equal("100\\%\\_off", PostgresSearchProvider.EscapeLike("100%_off"));
}
