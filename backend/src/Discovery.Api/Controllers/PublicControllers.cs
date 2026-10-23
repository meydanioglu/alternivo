using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Application.Contracts;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Discovery.Api.Controllers;

[ApiController]
[Route("api/v1/applications")]
[Produces("application/json")]
public sealed class ApplicationsController(CatalogService catalog, IValidator<CatalogFilter> filterValidator) : ControllerBase
{
    /// <summary>Lists published applications with filters, sorting and pagination.</summary>
    [HttpGet]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public async Task<PagedResult<ApplicationSummaryDto>> List([FromQuery] CatalogFilter filter, CancellationToken ct)
    {
        await filterValidator.ValidateAndThrowAsync(filter, ct);
        return await catalog.ListAsync(filter, ct);
    }

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public Task<ApplicationDetailDto> Get(string slug, CancellationToken ct) => catalog.GetBySlugAsync(slug, ct);

    /// <summary>Ranked alternatives with transparent ranking signals and facet counts.</summary>
    [HttpGet("{slug}/alternatives")]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public async Task<AlternativesPageDto> Alternatives(string slug, [FromQuery] CatalogFilter filter, CancellationToken ct)
    {
        await filterValidator.ValidateAndThrowAsync(filter, ct);
        return await catalog.GetAlternativesAsync(slug, filter, ct);
    }
}

[ApiController]
[Route("api/v1/categories")]
[Produces("application/json")]
public sealed class CategoriesController(TaxonomyService taxonomy) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public Task<IReadOnlyList<CategoryDto>> List(CancellationToken ct) => taxonomy.GetCategoryTreeAsync(ct);

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any)]
    public Task<CategoryDetailDto> Get(string slug, CancellationToken ct) => taxonomy.GetCategoryAsync(slug, ct);
}

[ApiController]
[Route("api/v1/platforms")]
[Produces("application/json")]
public sealed class PlatformsController(TaxonomyService taxonomy) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public Task<IReadOnlyList<PlatformRef>> List(CancellationToken ct) => taxonomy.GetPlatformsAsync(ct);
}

[ApiController]
[Route("api/v1/search")]
[Produces("application/json")]
public sealed class SearchController(SearchService search) : ControllerBase
{
    [HttpGet]
    public Task<SearchResultDto> Search([FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
        search.SearchAsync(q, page, pageSize, ct);

    [HttpGet("suggestions")]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any)]
    public Task<IReadOnlyList<SuggestionDto>> Suggestions([FromQuery] string? q, CancellationToken ct) =>
        search.SuggestAsync(q, ct);
}

[ApiController]
[Route("api/v1/compare")]
[Produces("application/json")]
public sealed class CompareController(CatalogService catalog) : ControllerBase
{
    /// <summary>GET /api/v1/compare?apps=notion&amp;apps=obsidian (2–4 apps).</summary>
    [HttpGet]
    [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any)]
    public Task<CompareDto> Compare([FromQuery] string[] apps, CancellationToken ct) => catalog.CompareAsync(apps, ct);

    /// <summary>GET /api/v1/compare/notion-vs-obsidian. The response carries the canonical slug.</summary>
    [HttpGet("{pair}")]
    [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any)]
    public Task<CompareDto> ComparePair(string pair, CancellationToken ct) =>
        catalog.CompareAsync(ComparisonSlug.Parse(pair) ?? throw new NotFoundException("Comparison", pair), ct);

    [HttpGet("popular")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public Task<IReadOnlyList<ComparisonRefDto>> Popular(CancellationToken ct) => catalog.PopularComparisonsAsync(null, 24, ct);
}

[ApiController]
[Route("api/v1/home")]
[Produces("application/json")]
public sealed class HomeController(HomeService home) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    public Task<HomeDto> Get(CancellationToken ct) => home.GetAsync(ct);
}

[ApiController]
[Route("api/v1/seo")]
[Produces("application/json")]
public sealed class SeoController(SeoService seo) : ControllerBase
{
    /// <summary>Canonical, indexable paths for a sitemap file (software, alternatives, categories, comparisons).</summary>
    [HttpGet("sitemaps/{type}")]
    [ResponseCache(Duration = 600, Location = ResponseCacheLocation.Any)]
    public Task<IReadOnlyList<SitemapEntryDto>> Sitemap(string type, [FromQuery] int page = 1, CancellationToken ct = default) =>
        seo.GetSitemapAsync(type, page, ct);

    /// <summary>Managed redirect lookup used by the frontend when a URL is not found.</summary>
    [HttpGet("redirect")]
    public async Task<ActionResult<RedirectDto>> FindRedirect([FromQuery] string path, CancellationToken ct)
    {
        var redirect = await seo.FindRedirectAsync(path, ct);
        if (redirect is null)
        {
            return NotFound();
        }

        return redirect;
    }
}
