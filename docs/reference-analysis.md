# Reference analysis — AlternativeTo patterns vs. Alternivo implementation

Source: the public AlternativeTo homepage and the Notion alternatives page, inspected in October 2026.
Only functional patterns and information architecture were studied. No code, text, images, logos or visual
design were copied. Alternivo's data model, ranking, copy and UI are original.

| Area | Observed pattern on the reference | Alternivo implementation |
|---|---|---|
| Homepage | Stats line, sponsored block, new releases, curated picks, recently updated apps, popular lists, discontinued apps, contributor leaderboards | Hero with autocomplete search and real stats from the database. Sections render only when real data exists: popular searches (from search logs), popular picks (likes plus editor score, labelled as such), categories, AI tools, open source, free, community favourites (likes > 0 only), recently added, comparisons, release history, latest reviews. No leaderboards, discontinued list or sponsored slots yet. |
| Alternatives page | Title + intro with count and platforms; category and attribute filters (platform, open source, self-hosted, free, region); numbered list; sponsored first entry; "last updated" | `/software/{slug}/alternatives`: real count, facet filters with counts (platform, pricing, license, features, self-hosted, privacy, offline), sort selector, numbered results, **transparent match score with per-signal breakdown**, data-derived "reasons to choose", shared features, compare action. Filtered URLs are `noindex` and canonicalised. No sponsored entries; when added, they will sit outside the organic ranking. |
| Entry fields | Icon, name, likes, description, link to that app's alternatives, cost/license tags, platforms, alerts (discontinued) | Logo/monogram, name, likes and rating (only when non-zero), description, pricing and license badges, attributes, platforms, provenance badge (editor/community), reasons, compare and details links. |
| Detail page | App profile with platforms, tags, likes, alternatives | `/software/{slug}`: description, features, platforms, top 6 ranked alternatives, "is an alternative to" (reverse relationships), similar software, reviews summary, details sidebar, verification status, JSON-LD. |
| Search | Global autocomplete | PostgreSQL full-text + trigram search over names, aliases, tags, categories; debounced autocomplete with request cancellation, keyboard navigation, recent searches; apps and categories in results. |
| Community | Likes, reviews with ratings, user lists, contributions | Backend: likes, alternative votes, reviews (1–5 stars, pros/cons, one per user), bookmarks, alternative suggestions with moderation, submissions with duplicate detection, reports. Frontend for sign-in and writing is the next phase. |
| Lists / news / leaderboards | Curated user lists, tech news, contributor points | Not built yet (planned). |

## Deliberate differences

- Relationships are **directed** with provenance (editorial / community / import) and moderation status.
- Ranking is configurable and its inputs are shown to the visitor.
- Thin pages (alternatives pages with fewer than 3 approved alternatives, categories with fewer than 3 apps, unrelated comparisons) are `noindex` and excluded from sitemaps.
- Seeded listings are labelled "not yet verified by an editor" until an editor confirms them.
