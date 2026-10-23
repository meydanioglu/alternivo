using Discovery.Application.Common;
using Discovery.Application.Contracts;
using Xunit;

namespace Discovery.UnitTests;

public class ContentJsonTests
{
    [Fact]
    public void Round_trips_sections()
    {
        var sections = new ContentSectionsDto(
            [new ContentFeatureDto("Offline notes", "Works without a connection.")],
            ["Personal knowledge base"], ["Students"], ["Fast search"], [],
            [new ContentFaqDto("Is it free?", "Yes, with paid add-ons.")]);

        var parsed = ContentJson.Parse(ContentJson.Serialize(sections));

        Assert.NotNull(parsed);
        Assert.Equal("Offline notes", parsed!.Features[0].Name);
        Assert.Empty(parsed.Cons);
        Assert.Equal("Is it free?", parsed.Faq[0].Question);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("{not json")]
    public void Invalid_or_missing_json_is_null(string? json) => Assert.Null(ContentJson.Parse(json));
}
