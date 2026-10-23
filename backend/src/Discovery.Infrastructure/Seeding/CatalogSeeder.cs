using System.Text.Json;
using Discovery.Application.Catalog;
using Discovery.Application.Common;
using Discovery.Domain;
using Discovery.Domain.Catalog;
using Discovery.Domain.Community;
using Discovery.Infrastructure.Identity;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Seeding;

/// <summary>
/// Idempotent importer for the curated catalog JSON (seed/catalog.json).
/// - Upserts by slug; records an editor has marked Verified are never overwritten.
/// - Never creates users, votes, reviews or popularity numbers.
/// - Imported applications are Published but flagged Unverified until an editor checks them.
/// </summary>
public sealed class CatalogSeeder(
    AppDbContext db,
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<AppUser> users,
    IConfiguration configuration,
    ILogger<CatalogSeeder> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { ReadCommentHandling = JsonCommentHandling.Skip };

    public async Task SeedRolesAndAdminAsync(CancellationToken ct)
    {
        foreach (var role in Roles.All)
        {
            if (!await roles.RoleExistsAsync(role))
            {
                await roles.CreateAsync(new IdentityRole<Guid>(role));
            }
        }

        var email = configuration["Admin:Email"];
        var password = configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogInformation("Admin:Email/Admin:Password not set; skipping super admin bootstrap.");
            return;
        }

        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new AppUser { UserName = email, Email = email, EmailConfirmed = true, DisplayName = "Admin" };
            var result = await users.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException("Could not create admin user: " +
                    string.Join("; ", result.Errors.Select(e => e.Description)));
            }
        }

        if (!await users.IsInRoleAsync(user, Roles.SuperAdmin))
        {
            await users.AddToRoleAsync(user, Roles.SuperAdmin);
        }
    }

    public async Task SeedCatalogAsync(string path, CancellationToken ct)
    {
        if (!File.Exists(path))
        {
            logger.LogWarning("Catalog seed file {Path} not found", path);
            return;
        }

        await using var stream = File.OpenRead(path);
        var data = await JsonSerializer.DeserializeAsync<CatalogFile>(stream, Json, ct)
            ?? throw new InvalidOperationException("Catalog seed file is empty.");
        Validate(data);

        var platforms = await UpsertAsync(db.Platforms, data.Platforms, p => p.Slug,
            p => new Platform { Slug = p.Slug, Name = p.Name },
            (e, p) => { e.Name = p.Name; e.Kind = Enum.Parse<PlatformKind>(p.Kind, true); e.SortOrder = p.SortOrder; }, ct);

        var licenses = await UpsertAsync(db.Licenses, data.Licenses, l => l.Slug,
            l => new License { Slug = l.Slug, Name = l.Name, Family = l.Family },
            (e, l) => { e.Name = l.Name; e.Family = l.Family; e.IsOpenSource = l.IsOpenSource; e.SpdxId = l.Spdx; }, ct);

        var features = await UpsertAsync(db.Features, data.Features, f => f.Slug,
            f => new Feature { Slug = f.Slug, Name = f.Name },
            (e, f) => e.Name = f.Name, ct);

        var categories = await UpsertAsync(db.Categories, data.Categories, c => c.Slug,
            c => new Category { Slug = c.Slug, Name = c.Name },
            (e, c) =>
            {
                e.Name = c.Name;
                e.Description = c.Description;
                e.SeoIntro = c.SeoIntro;
                e.Icon = c.Icon;
                e.IsFeatured = c.Featured;
                e.SortOrder = c.SortOrder;
            }, ct);
        foreach (var c in data.Categories.Where(c => c.Parent is not null))
        {
            categories[c.Slug].ParentId = categories[c.Parent!].Id;
        }

        await db.SaveChangesAsync(ct);

        var tagNames = data.Applications.SelectMany(a => a.Tags).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var tags = await db.Tags.ToDictionaryAsync(t => t.Slug, ct);
        foreach (var name in tagNames)
        {
            var slug = Slugs.Create(name);
            if (!tags.ContainsKey(slug))
            {
                var tag = new Tag { Slug = slug, Name = name };
                db.Tags.Add(tag);
                tags[slug] = tag;
            }
        }

        var existingApps = await db.Applications
            .Include(a => a.Categories).Include(a => a.Platforms).Include(a => a.Features)
            .Include(a => a.Tags).Include(a => a.Aliases)
            .ToDictionaryAsync(a => a.Slug, ct);
        var now = DateTimeOffset.UtcNow;
        var created = 0;
        var updated = 0;

        foreach (var item in data.Applications)
        {
            if (existingApps.TryGetValue(item.Slug, out var app))
            {
                if (app.Verification == VerificationStatus.Verified)
                {
                    continue;
                }

                updated++;
            }
            else
            {
                app = new SoftwareApplication { Slug = item.Slug, Name = item.Name, ShortDescription = item.ShortDescription };
                db.Applications.Add(app);
                existingApps[item.Slug] = app;
                created++;
            }

            app.Name = item.Name;
            app.ShortDescription = item.ShortDescription;
            app.Description = item.Description;
            app.WebsiteUrl = item.Website;
            app.Developer = item.Developer;
            app.Pricing = PricingNames.Combine(item.Pricing);
            app.LicenseId = item.License is null ? null : licenses[item.License].Id;
            app.IsSelfHostable = item.SelfHostable;
            app.IsPrivacyFocused = item.PrivacyFocused;
            app.HasOfflineSupport = item.Offline;
            app.ReleasedOn = item.ReleasedOn is null ? null : DateOnly.Parse(item.ReleasedOn);
            app.EditorialScore = item.EditorialScore;
            app.IsDemoData = false;
            if (app.Status == PublicationStatus.Draft)
            {
                app.Publish(now);
            }

            ReplaceJoin(app.Categories, item.Categories.Select((slug, i) => new ApplicationCategory
            {
                ApplicationId = app.Id, CategoryId = categories[slug].Id, IsPrimary = i == 0,
            }), x => x.CategoryId);
            ReplaceJoin(app.Platforms, item.Platforms.Select(slug => new ApplicationPlatform
            {
                ApplicationId = app.Id, PlatformId = platforms[slug].Id,
            }), x => x.PlatformId);
            ReplaceJoin(app.Features, item.Features.Select(slug => new ApplicationFeature
            {
                ApplicationId = app.Id, FeatureId = features[slug].Id,
            }), x => x.FeatureId);
            ReplaceJoin(app.Tags, item.Tags.Select(name => new ApplicationTag
            {
                ApplicationId = app.Id, TagId = tags[Slugs.Create(name)].Id,
            }), x => x.TagId);
            app.Aliases.RemoveAll(a => !item.Aliases.Contains(a.Alias));
            foreach (var alias in item.Aliases.Where(a => app.Aliases.All(x => x.Alias != a)))
            {
                app.Aliases.Add(new ApplicationAlias { ApplicationId = app.Id, Alias = alias });
            }

            app.SearchText = SearchText.Build(app, item.Aliases,
                item.Categories.Select(s => categories[s].Name),
                item.Tags,
                item.Features.Select(s => features[s].Name));
        }

        await db.SaveChangesAsync(ct);

        // Editorial alternative relationships (directed: listed apps are alternatives TO the item).
        var relationships = await db.AlternativeRelationships
            .Select(r => new { r.SourceApplicationId, r.AlternativeApplicationId })
            .ToListAsync(ct);
        var known = relationships.Select(r => (r.SourceApplicationId, r.AlternativeApplicationId)).ToHashSet();
        var added = 0;
        foreach (var item in data.Applications)
        {
            var source = existingApps[item.Slug];
            foreach (var altSlug in item.Alternatives.Distinct())
            {
                var alt = existingApps[altSlug];
                if (alt.Id == source.Id || !known.Add((source.Id, alt.Id)))
                {
                    continue;
                }

                db.AlternativeRelationships.Add(new AlternativeRelationship
                {
                    SourceApplicationId = source.Id,
                    AlternativeApplicationId = alt.Id,
                    Source = RelationshipSource.Editorial,
                    Status = ModerationStatus.Approved,
                    ModeratedAt = now,
                });
                added++;
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "Catalog seed complete: {Created} created, {Updated} updated applications, {Relationships} new relationships",
            created, updated, added);
    }

    private static void Validate(CatalogFile data)
    {
        var errors = new List<string>();
        var platformSlugs = data.Platforms.Select(p => p.Slug).ToHashSet();
        var licenseSlugs = data.Licenses.Select(l => l.Slug).ToHashSet();
        var categorySlugs = data.Categories.Select(c => c.Slug).ToHashSet();
        var featureSlugs = data.Features.Select(f => f.Slug).ToHashSet();
        var appSlugs = new HashSet<string>();

        foreach (var c in data.Categories.Where(c => c.Parent is not null && !categorySlugs.Contains(c.Parent)))
            errors.Add($"Category {c.Slug}: unknown parent {c.Parent}");

        foreach (var a in data.Applications)
        {
            if (!Slugs.IsValid(a.Slug)) errors.Add($"Invalid slug {a.Slug}");
            if (!appSlugs.Add(a.Slug)) errors.Add($"Duplicate application {a.Slug}");
            if (a.ShortDescription.Length > 200) errors.Add($"{a.Slug}: short description over 200 chars");
            if (a.Website is not null && !UrlSafety.IsSafePublicWebUrl(a.Website)) errors.Add($"{a.Slug}: unsafe website");
            if (a.License is not null && !licenseSlugs.Contains(a.License)) errors.Add($"{a.Slug}: unknown license {a.License}");
            if (a.Categories.Count == 0) errors.Add($"{a.Slug}: needs at least one category");
            errors.AddRange(a.Categories.Where(s => !categorySlugs.Contains(s)).Select(s => $"{a.Slug}: unknown category {s}"));
            errors.AddRange(a.Platforms.Where(s => !platformSlugs.Contains(s)).Select(s => $"{a.Slug}: unknown platform {s}"));
            errors.AddRange(a.Features.Where(s => !featureSlugs.Contains(s)).Select(s => $"{a.Slug}: unknown feature {s}"));
            errors.AddRange(a.Pricing.Where(p => !PricingNames.All.Contains(p)).Select(p => $"{a.Slug}: unknown pricing {p}"));
        }

        foreach (var a in data.Applications)
            errors.AddRange(a.Alternatives.Where(s => !appSlugs.Contains(s)).Select(s => $"{a.Slug}: unknown alternative {s}"));

        if (errors.Count > 0)
        {
            throw new InvalidOperationException("Catalog seed validation failed:\n" + string.Join('\n', errors));
        }
    }

    private static async Task<Dictionary<string, TEntity>> UpsertAsync<TEntity, TItem>(
        DbSet<TEntity> set,
        IEnumerable<TItem> items,
        Func<TItem, string> slugOf,
        Func<TItem, TEntity> create,
        Action<TEntity, TItem> apply,
        CancellationToken ct)
        where TEntity : Domain.Common.Entity
    {
        var existing = await set.ToListAsync(ct);
        var bySlug = existing.ToDictionary(e => (string)typeof(TEntity).GetProperty("Slug")!.GetValue(e)!);
        foreach (var item in items)
        {
            var slug = slugOf(item);
            if (!bySlug.TryGetValue(slug, out var entity))
            {
                entity = create(item);
                set.Add(entity);
                bySlug[slug] = entity;
            }

            apply(entity, item);
        }

        return bySlug;
    }

    private static void ReplaceJoin<T>(List<T> current, IEnumerable<T> desired, Func<T, Guid> key)
        where T : class
    {
        var target = desired.ToList();
        var targetKeys = target.Select(key).ToHashSet();
        current.RemoveAll(c => !targetKeys.Contains(key(c)));
        foreach (var item in target)
        {
            var existing = current.FirstOrDefault(c => key(c) == key(item));
            if (existing is null)
            {
                current.Add(item);
            }
            else if (existing is ApplicationCategory ec && item is ApplicationCategory ic)
            {
                ec.IsPrimary = ic.IsPrimary;
            }
        }
    }

    // ----- seed file model -----

    public sealed record CatalogFile(
        List<PlatformItem> Platforms,
        List<LicenseItem> Licenses,
        List<CategoryItem> Categories,
        List<FeatureItem> Features,
        List<ApplicationItem> Applications);

    public sealed record PlatformItem(string Slug, string Name, string Kind, int SortOrder);

    public sealed record LicenseItem(string Slug, string Name, bool IsOpenSource, string Family, string? Spdx);

    public sealed record CategoryItem(
        string Slug, string Name, string? Description, string? SeoIntro, string? Parent, bool Featured, string? Icon, int SortOrder);

    public sealed record FeatureItem(string Slug, string Name);

    public sealed record ApplicationItem(
        string Slug,
        string Name,
        string ShortDescription,
        string? Description,
        string? Website,
        string? Developer,
        List<string> Pricing,
        string? License,
        bool SelfHostable,
        bool PrivacyFocused,
        bool Offline,
        string? ReleasedOn,
        int EditorialScore,
        List<string> Categories,
        List<string> Platforms,
        List<string> Features,
        List<string> Tags,
        List<string> Aliases,
        List<string> Alternatives);
}
