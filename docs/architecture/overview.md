# Architecture overview

```
Browser ──▶ Caddy (TLS, :80/:443) ──▶ Next.js (frontend/, :3000) ──▶ ASP.NET Core API (backend/, :8080) ──▶ PostgreSQL
                                          │  server components fetch          │                               └▶ Redis (cache)
                                          │  with X-Internal-Key              │
                                          └─ /bff/suggestions (thin proxy) ───┘
```

## Backend — modular monolith (.NET 10)

| Project | Responsibility |
|---|---|
| `Discovery.Domain` | Entities and enums. No framework dependencies. |
| `Discovery.Application` | Use cases (catalog, search, ranking, community, admin), DTOs, validation (FluentValidation). Depends on EF Core abstractions only. |
| `Discovery.Infrastructure` | EF Core + Npgsql `AppDbContext`, entity configurations, PostgreSQL search provider, Redis cache, ASP.NET Identity user, seeding, e-mail. |
| `Discovery.Api` | Controllers, auth/role policies, rate limiting, ProblemDetails, OpenAPI, health checks, Serilog. |

Project names are brand-neutral (`Discovery.*`) so the product can be renamed without touching namespaces.

### Key decisions

- **Directed alternative relationships** (`Source → Alternative`) with provenance and moderation status. Never assumed symmetric.
- **Transparent ranking** (`Application/Ranking/AlternativeRanker.cs`): weighted, normalised signals (votes, feature overlap, platform compatibility, category relevance, Bayesian rating, freshness, editorial score). Weights live in `appsettings.json → Ranking`. The API returns each signal so the UI can explain the order.
- **Search** behind `ISearchProvider`. Initial implementation: PostgreSQL weighted `tsvector` (generated column) with prefix queries, plus `pg_trgm` similarity for typos. Swappable for Meilisearch/Typesense/Elasticsearch.
- **Counters** (`LikeCount`, `ReviewCount`, `RatingAverage`) are denormalised but always recomputed from source tables; duplicate votes are prevented by composite primary keys.
- **Caching**: Redis via `IDistributedCache` for home, taxonomy and detail payloads, invalidated on votes, reviews and admin changes. Cache failures degrade to direct DB reads.
- **Auth**: ASP.NET Core Identity API endpoints (`/api/v1/auth/*`) issuing bearer + refresh tokens; roles SuperAdmin, Admin, Editor, Moderator, Member; every admin action is authorised server-side by policy. Data-protection keys persisted to a volume.
- **Rate limiting**: per-IP fixed window globally; per-user sliding window for writes. Server-side rendering from Next.js authenticates with a shared internal key and is not throttled.
- **SEO thin-content rules** live in the API (indexability flags, sitemap queries), so the frontend never has to guess.

## Frontend — Next.js 16 App Router

- Server Components fetch from the API for every public page; primary content is in the initial HTML.
- Client Components only for search autocomplete, filters, sort, drawers, theme toggle, share and compare picker.
- Filter state lives in the URL (validated with Zod); filtered/sorted URLs are `noindex` with a canonical to the base page.
- Metadata API for titles, descriptions, canonicals, Open Graph and Twitter; JSON-LD for WebSite, Organization, BreadcrumbList, ItemList, SoftwareApplication (AggregateRating only with real reviews).
- Sitemap index at `/sitemap.xml`, per-type sitemaps at `/sitemaps/{software|alternatives|categories|comparisons|pages}.xml`.
- `/bff/*` route handlers are thin proxies only (no business logic). Authenticated actions will follow the same pattern with tokens kept in httpOnly cookies.

## Not built yet

See README → "Status".
