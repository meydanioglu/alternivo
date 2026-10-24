using Discovery.Application.Admin;
using Discovery.Application.Catalog;
using Discovery.Application.Community;
using Discovery.Application.Ranking;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Discovery.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RankingOptions>(configuration.GetSection(RankingOptions.SectionName));
        services.Configure<CatalogOptions>(configuration.GetSection(CatalogOptions.SectionName));
        services.AddValidatorsFromAssemblyContaining<CatalogFilterValidator>(includeInternalTypes: true);
        services.AddSingleton(TimeProvider.System);

        services.AddScoped<CatalogService>();
        services.AddScoped<TaxonomyService>();
        services.AddScoped<HomeService>();
        services.AddScoped<LaunchService>();
        services.AddScoped<SearchService>();
        services.AddScoped<SeoService>();
        services.AddScoped<CommunityService>();
        services.AddScoped<AdminService>();
        services.AddScoped<PanelService>();
        services.AddScoped<ImportService>();
        services.AddScoped<ContentService>();
        services.AddScoped<Community.MakerService>();
        services.AddScoped<Community.SponsorService>();
        return services;
    }
}
