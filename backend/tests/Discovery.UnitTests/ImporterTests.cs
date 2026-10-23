using Discovery.Infrastructure.Importing;
using Xunit;

namespace Discovery.UnitTests;

public class ImporterTests
{
    [Theory]
    [InlineData("", true)]
    [InlineData("User-agent: *\nDisallow:", true)]
    [InlineData("User-agent: *\nDisallow: /admin\nDisallow: /private", true)]
    [InlineData("User-agent: *\nDisallow: /", false)]
    [InlineData("User-agent: AlternivoBot\nDisallow: /\n\nUser-agent: *\nAllow: /", false)]
    [InlineData("User-agent: *\nDisallow: /\n\nUser-agent: AlternivoBot\nAllow: /", true)]
    [InlineData("User-agent: Googlebot\nDisallow: /", true)]
    [InlineData("# comment\nUser-agent: GPTBot\nUser-agent: *\nDisallow: / # everything", false)]
    public void Robots_root_rules(string robots, bool allowed) => Assert.Equal(allowed, ProductImporter.RobotsAllowsRoot(robots));

    [Fact]
    public void Detects_image_signatures_and_rejects_html()
    {
        Assert.Equal(".png", ProductImporter.DetectImage([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]));
        Assert.Equal(".jpg", ProductImporter.DetectImage([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0]));
        Assert.Equal(".ico", ProductImporter.DetectImage([0, 0, 1, 0, 1, 0, 16, 16, 0, 0, 0, 0]));
        Assert.Equal(".svg", ProductImporter.DetectImage("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"u8.ToArray()));
        Assert.Null(ProductImporter.DetectImage("<!doctype html><html><body>blocked</body></html>"u8.ToArray()));
    }

    [Fact]
    public void Measures_png_and_ico_sizes()
    {
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 180, 0, 0, 0, 180, 8, 6, 0, 0, 0];
        Assert.Equal((180, 180), ProductImporter.ImageSize(png));

        // ICO directory with a 16px and a 256px (stored as 0) entry: the largest wins.
        var ico = new byte[6 + 32];
        ico[2] = 1; ico[4] = 2;
        ico[6] = 16; ico[7] = 16;
        ico[22] = 0; ico[23] = 0;
        Assert.Equal((256, 256), ProductImporter.ImageSize(ico));

        Assert.Equal((0, 0), ProductImporter.ImageSize("<svg/>"u8.ToArray()));
    }
}
