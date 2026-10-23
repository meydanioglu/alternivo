# Alternivo

Software discovery and alternatives platform — find, compare and choose apps with transparent rankings.
Brand name and domain are configuration (`SITE_NAME`, `SITE_URL`, `DOMAIN` in `.env`) and can be changed later.

```
backend/    ASP.NET Core (.NET 10) API, EF Core + PostgreSQL, Redis, Identity  → see backend/
frontend/   Next.js 16 App Router, React 19, TypeScript (strict), Tailwind v4, HeroUI v3
deploy/     setup-server.sh (one-shot install), add-migration.sh
infrastructure/caddy/   reverse proxy with automatic HTTPS
docs/       architecture, design system, reference analysis
```

## Sunucuya kurulum (hızlı)

Ubuntu/Debian sunucuda, root olarak:

```bash
git clone https://github.com/meydanioglu/alternivo.git /opt/alternivo
cd /opt/alternivo
bash deploy/setup-server.sh
```

Script şunları yapar: Docker yoksa kurar, `.env` dosyasını rastgele şifrelerle oluşturur (admin şifresini ekrana yazar),
ilk EF Core migration'ını üretir, tüm servisleri derleyip başlatır ve API sağlık kontrolünü bekler.
Site `http://SUNUCU_IP/` adresinde açılır. Domain DNS'i sunucuya yönlendirildiğinde `.env` içinde `DOMAIN=alternivo.com`
yapıp `docker compose up -d` çalıştırın; Caddy HTTPS sertifikasını otomatik alır.

Script hiçbir şeyi silmez. Sunucudaki eski içerikleri kendiniz temizlemelisiniz.

## Local development

Requirements: Docker, .NET 10 SDK, Node.js 22+.

```bash
cp .env.example .env            # fill POSTGRES_PASSWORD, API_INTERNAL_KEY, ADMIN_* 
docker compose up -d postgres redis

# API (applies migrations and seeds on startup in Development)
cd backend
dotnet run --project src/Discovery.Api          # http://localhost:8080, Swagger at /swagger
dotnet run --project src/Discovery.Api -- seed  # one-off: migrate + import seed/catalog.json, then exit
dotnet test

# Web
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                                     # http://localhost:3000
npm run gen:api                                 # regenerate typed client from the running API's OpenAPI document
```

Migrations: `bash deploy/add-migration.sh <Name>` (uses the SDK container) or
`dotnet ef migrations add <Name> --project src/Discovery.Infrastructure --startup-project src/Discovery.Api --output-dir Persistence/Migrations`.
The initial migration is generated on first setup and should then be committed.

## API (v1)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/home` | Homepage sections, real counts only |
| GET | `/api/v1/applications` | Filters: `platform`, `pricing`, `license`, `category`, `feature`, `tag`, `selfHosted`, `privacyFocused`, `offline`, `minRating`, `sort`, `page`, `pageSize` |
| GET | `/api/v1/applications/{slug}` | Detail, top alternatives, reverse relationships, similar, reviews |
| GET | `/api/v1/applications/{slug}/alternatives` | Ranked alternatives with signals, reasons and facet counts |
| GET | `/api/v1/categories`, `/api/v1/categories/{slug}` | Tree with counts; detail with featured apps, comparisons |
| GET | `/api/v1/platforms` | |
| GET | `/api/v1/search?q=`, `/api/v1/search/suggestions?q=` | FTS + trigram |
| GET | `/api/v1/compare/{a-vs-b}`, `/api/v1/compare?apps=a&apps=b`, `/api/v1/compare/popular` | Canonical pair slug in response |
| GET | `/api/v1/seo/sitemaps/{type}`, `/api/v1/seo/redirect?path=` | Indexable URLs; managed redirects |
| POST | `/api/v1/auth/register`, `/login`, `/refresh`, `/confirmEmail`, `/forgotPassword`, `/resetPassword`, … | ASP.NET Identity endpoints |
| GET/PATCH | `/api/v1/users/me`, `/me/bookmarks`, `/me/submissions` | Authenticated |
| PUT/DELETE | `/api/v1/applications/{id}/votes`, `/bookmark`; `/api/v1/alternatives/{id}/votes` | Authenticated, rate limited, duplicate-proof |
| GET/POST | `/api/v1/applications/{id}/reviews`; PUT `/api/v1/reviews/{id}` | One review per user per app |
| POST | `/api/v1/applications/{slug}/alternatives`, `/api/v1/submissions`, `/api/v1/reports` | Enter moderation |
| * | `/api/v1/admin/*` | Dashboard, applications CRUD/publish, submissions, alternatives, reviews, reports, redirects, roles |
| GET | `/health`, `/openapi/v1.json`, `/swagger` | |

## Status

**Phase 1–3 (foundation, database & public API, public frontend): code complete, not yet compiled or run.**
This repository was written in an environment without access to npm, NuGet or the .NET SDK, so nothing has been
built or tested yet. The first `docker compose up --build` on the server is the first compile. Expect to fix a
small number of build errors on that first run.

Built:
- Domain model, EF Core configurations (indexes, check constraints, xmin concurrency, trigram + FTS indexes)
- Public API with filtering, sorting, pagination, ProblemDetails, validation, caching, rate limiting, health checks
- Transparent alternatives ranking; data-derived "reasons to choose"
- Community and admin APIs (likes, alternative votes, reviews, bookmarks, suggestions, submissions with duplicate detection, reports, moderation, redirects, audit log)
- Curated seed catalogue: 89 real applications, 28 categories, editorial alternative groups. No fake users, votes, reviews or popularity
- Frontend: home, all software, detail, alternatives (filters, sort, score breakdown), categories, category, compare builder, comparison pages, search, new apps, most liked, sitemaps, robots, JSON-LD, dark mode
- Docker Compose (Postgres, Redis, API, web, Caddy), one-shot server setup
- Unit tests for ranking, slugs, comparison canonicalisation, URL safety (SSRF), filters, search query sanitising

Next:
- Phase 4 frontend: sign-in/registration via httpOnly-cookie BFF, like/save/review/suggest UI, submit page, profiles, lists
- Phase 5: admin UI (the admin API exists)
- Phase 6: `/best/*`, `/free/*`, `/open-source/*`, `/platform/*` landing pages with thin-content rules, editorial/news, SEO templates
- Phase 7: integration tests (Testcontainers), Playwright E2E and axe accessibility tests, performance budget
- Logos and screenshots (media upload pipeline); currently a monogram is shown
