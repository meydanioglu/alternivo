using Discovery.Application.Admin;
using Discovery.Application.Catalog;
using Discovery.Domain;
using Xunit;

namespace Discovery.UnitTests;

public class QualityTests
{
    [Theory]
    [InlineData("https://www.rosebud.app/", "rosebud.app")]
    [InlineData("https://github.com/google-gemini/gemini-cli", "github.com/google-gemini/gemini-cli")]
    [InlineData("https://www.adobe.com/products/photoshop.html", "adobe.com/products/photoshop.html")]
    [InlineData("https://openai.com/codex", "openai.com/codex")]
    [InlineData("not a url", null)]
    public void Domain_key_keeps_first_path_segment_for_shared_hosts(string url, string? expected) =>
        Assert.Equal(expected, QualityService.DomainKey(url));

    [Fact]
    public void Rosebud_journal_and_game_maker_share_a_brand_stem_but_not_a_name()
    {
        Assert.Equal(QualityService.BrandStem("Rosebud"), QualityService.BrandStem("Rosebud AI"));
        Assert.NotEqual(QualityService.NormalizeName("Rosebud"), QualityService.NormalizeName("Rosebud AI"));
    }

    [Theory]
    [InlineData("Rosebud AI", "rosebud-ai", "rosebud.ai", true)]
    [InlineData("Google Playground", "google-playground", "playground.google", true)]
    [InlineData("Godot Engine", "godot-engine", "godotengine.org", true)]
    [InlineData("Notion", "notion", "obsidian.md", false)]
    public void Brand_and_domain_matching(string name, string slug, string host, bool expected) =>
        Assert.Equal(expected, QualityService.BrandMatchesHost(name, slug, host));

    [Theory]
    [InlineData("docs.google.com", "google.com")]
    [InlineData("podcast.adobe.com", "adobe.com")]
    [InlineData("example.co.uk", "example.co.uk")]
    [InlineData("shop.example.co.uk", "example.co.uk")]
    public void Registrable_domain(string host, string expected) => Assert.Equal(expected, QualityService.RegistrableDomain(host));

    [Fact]
    public void Confirmed_distinct_pairs_are_order_independent()
    {
        Assert.True(QualityService.IsConfirmedDistinct("rosebud-ai", "rosebud"));
        Assert.False(QualityService.IsConfirmedDistinct("notion", "obsidian"));
    }

    [Theory]
    [InlineData("www.google.com", true)]
    [InlineData("duckduckgo.com", true)]
    [InlineData("t.co", false)]
    [InlineData(null, false)]
    public void Organic_referrers(string? host, bool expected) => Assert.Equal(expected, QualityService.IsOrganic(host));

    [Fact]
    public void Same_category_link_alone_does_not_make_an_indexable_comparison()
    {
        Assert.False(ComparisonPolicy.IsIndexable([RelationshipSource.Import], sharesFeaturesOrTags: false));
        Assert.True(ComparisonPolicy.IsIndexable([RelationshipSource.Import], sharesFeaturesOrTags: true));
        Assert.True(ComparisonPolicy.IsIndexable([RelationshipSource.Editorial], sharesFeaturesOrTags: false));
        Assert.True(ComparisonPolicy.IsIndexable([RelationshipSource.Community], sharesFeaturesOrTags: false));
        Assert.False(ComparisonPolicy.IsIndexable([], sharesFeaturesOrTags: true));
    }
}
