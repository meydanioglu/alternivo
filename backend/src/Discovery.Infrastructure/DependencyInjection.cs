using Discovery.Application.Abstractions;
using Discovery.Infrastructure.Caching;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Importing;
using Discovery.Infrastructure.Persistence;
using Discovery.Infrastructure.Search;
using Discovery.Infrastructure.Seeding;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Discovery.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgres = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not configured.");

        services.AddDbContext<AppDbContext>(options => options
            .UseNpgsql(postgres, npgsql => npgsql
                .MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)
                .EnableRetryOnFailure(3))
            .UseQueryTrackingBehavior(QueryTrackingBehavior.TrackAll));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        var redis = configuration.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(redis))
        {
            services.AddDistributedMemoryCache();
        }
        else
        {
            services.AddStackExchangeRedisCache(o =>
            {
                o.Configuration = redis;
                o.InstanceName = "discovery:";
            });
        }

        services.AddScoped<ICacheService, DistributedCacheService>();
        services.AddScoped<ISearchProvider, PostgresSearchProvider>();
        services.AddScoped<IUserDirectory, UserDirectory>();
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddTransient<IEmailSender<AppUser>, EmailSender>();
        services.AddScoped<CatalogSeeder>();

        services.AddHttpClient(ProductImporter.HttpClientName, c =>
            {
                c.Timeout = TimeSpan.FromSeconds(20);
                c.DefaultRequestHeaders.UserAgent.ParseAdd(ProductImporter.UserAgent);
                c.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
            })
            .ConfigurePrimaryHttpMessageHandler(ProductImporter.CreateHandler);
        services.AddScoped<ProductImporter>();
        services.AddScoped<Community.ShareProofVerifier>();

        services.AddHttpClient(Content.ContentGenerator.OpenAiClientName, c => c.Timeout = TimeSpan.FromMinutes(3));
        services.AddScoped<Content.AiSettings>();
        services.AddScoped<Billing.IntegrationSettings>();
        services.AddHttpClient(Billing.PayTrGateway.HttpClientName, c => c.Timeout = TimeSpan.FromSeconds(30));
        services.AddScoped<Billing.PayTrGateway>();
        services.AddHttpClient(GoogleSignIn.HttpClientName, c => c.Timeout = TimeSpan.FromSeconds(20));
        services.AddScoped<GoogleSignIn>();
        services.AddScoped<Content.ContentGenerator>();
        services.AddHostedService<Content.ContentWorker>();
        services.AddHostedService<Seo.SeoSnapshotWorker>();
        if (configuration.GetValue("Import:WorkerEnabled", true))
        {
            services.AddHostedService<ImportWorker>();
        }
        return services;
    }
}
