using System.Threading.RateLimiting;
using Discovery.Api.Infrastructure;
using Discovery.Application;
using Discovery.Application.Abstractions;
using Discovery.Infrastructure;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Discovery.Infrastructure.Seeding;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, logger) => logger
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console(new RenderedCompactJsonFormatter()));

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<HttpCurrentUser>();
builder.Services.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<HttpCurrentUser>());

// ---------- Identity & auth ----------
var requireConfirmedEmail = builder.Configuration.GetValue("Auth:RequireConfirmedEmail", true);
builder.Services
    .AddIdentityApiEndpoints<AppUser>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.SignIn.RequireConfirmedEmail = requireConfirmedEmail;
        o.Password.RequiredLength = 10;
        o.Password.RequireNonAlphanumeric = false;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.Configure<BearerTokenOptions>(IdentityConstants.BearerScheme, o =>
{
    o.BearerTokenExpiration = TimeSpan.FromHours(1);
    o.RefreshTokenExpiration = TimeSpan.FromDays(14);
});

builder.Services.AddDataProtection()
    .SetApplicationName("discovery-api")
    .PersistKeysToFileSystem(new DirectoryInfo(builder.Configuration["DataProtection:KeysPath"] ?? "/app/keys"));

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.Staff, p => p.RequireRole(Roles.SuperAdmin, Roles.Admin, Roles.Editor, Roles.Moderator))
    .AddPolicy(Policies.Moderation, p => p.RequireRole(Roles.SuperAdmin, Roles.Admin, Roles.Moderator))
    .AddPolicy(Policies.Editorial, p => p.RequireRole(Roles.SuperAdmin, Roles.Admin, Roles.Editor))
    .AddPolicy(Policies.Administration, p => p.RequireRole(Roles.SuperAdmin, Roles.Admin))
    .AddPolicy(Policies.SuperAdmin, p => p.RequireRole(Roles.SuperAdmin));

// ---------- API plumbing ----------
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddOpenApi();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("postgres")
    .AddCheck<CacheHealthCheck>("cache");

var internalKey = builder.Configuration["Api:InternalKey"];
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Server-side rendering from the Next.js container authenticates with a shared key and is not throttled.
    bool IsInternal(HttpContext ctx) =>
        !string.IsNullOrEmpty(internalKey)
        && ctx.Request.Headers.TryGetValue("X-Internal-Key", out var key)
        && key == internalKey;

    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        IsInternal(ctx)
            ? RateLimitPartition.GetNoLimiter("internal")
            : RateLimitPartition.GetFixedWindowLimiter(
                ClientIp.Resolve(ctx),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) }));

    o.AddPolicy(Policies.WritesRateLimit, ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(
            ctx.User.Identity?.Name ?? ClientIp.Resolve(ctx),
            _ => new SlidingWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(5), SegmentsPerWindow = 5 }));
});

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
if (corsOrigins.Length > 0)
{
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));
}

var app = builder.Build();

// ---------- One-off commands: `dotnet Discovery.Api.dll migrate|seed` ----------
var command = args.FirstOrDefault(a => a is "migrate" or "seed");
if (command is not null || app.Configuration.GetValue("Database:MigrateOnStartup", false))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    var seeder = scope.ServiceProvider.GetRequiredService<CatalogSeeder>();
    await seeder.SeedRolesAndAdminAsync(CancellationToken.None);
    if (command == "seed" || app.Configuration.GetValue("Seed:OnStartup", false))
    {
        var path = app.Configuration["Seed:CatalogPath"] ?? Path.Combine(AppContext.BaseDirectory, "seed", "catalog.json");
        await seeder.SeedCatalogAsync(path, CancellationToken.None);
    }

    if (command is not null)
    {
        Log.Information("Command {Command} completed", command);
        return;
    }
}

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
if (corsOrigins.Length > 0)
{
    app.UseCors();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
if (app.Environment.IsDevelopment() || app.Configuration.GetValue("Swagger:Enabled", false))
{
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Discovery API v1"));
}

// Uploaded media (avatars, logos). Served by the API; the web app proxies /media/* to here.
var mediaPath = builder.Configuration["Media:Path"] ?? "/app/media";
Directory.CreateDirectory(mediaPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(mediaPath),
    RequestPath = "/media",
    ServeUnknownFileTypes = false,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        ctx.Context.Response.Headers.XContentTypeOptions = "nosniff";
        ctx.Context.Response.Headers.ContentSecurityPolicy = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
    },
});

app.MapHealthChecks("/health");
app.MapGroup("/api/v1/auth").WithTags("Auth").MapIdentityApi<AppUser>();
app.MapControllers();

app.Run();

public partial class Program;
