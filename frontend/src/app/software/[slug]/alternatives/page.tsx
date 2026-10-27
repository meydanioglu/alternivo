import { ArrowRight, Info, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SponsoredSlot } from "@/components/sponsored/sponsored-slot";
import { Suspense } from "react";
import { api } from "@/lib/api/client";
import type { AlternativeItem, AlternativesPage } from "@/lib/api/types";
import { ATTRIBUTE_OPTIONS, filtersToQuery, hasActiveFilters, parseFilters, SORT_OPTIONS, type RawSearchParams } from "@/lib/filters";
import { currentYear, plural, SIGNAL_LABELS } from "@/lib/format";
import { loadOrNotFound } from "@/lib/resolve";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";
import { AlternativesIntents } from "@/components/catalog/alternatives-intents";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { platformSummary } from "@/components/catalog/application-card";
import { pricingSummary } from "@/components/catalog/software-row";
import { AlternativeRelationshipBadge, AttributeBadges, LicenseBadge, PlatformList, PricingBadge } from "@/components/catalog/badges";
import { FilterSidebar, MobileFilterDrawer, type FilterGroup, type ToggleOption } from "@/components/filters/filter-panel";
import { SortSelector } from "@/components/filters/sort-selector";
import { BreadcrumbNavigation, Container, EmptyState, Pagination, pageHref } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { AlternativeVoteButton, SuggestAlternativeForm } from "@/components/catalog/community-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { buttonClass, chipClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

const PAGE_SIZE = 20;

async function load(slug: string, raw: RawSearchParams) {
  const filters = parseFilters(raw);
  const data = await loadOrNotFound(
    () => api.alternatives(slug, filtersToQuery(filters, PAGE_SIZE)),
    `/software/${slug}/alternatives`,
  );
  return { filters, data };
}

function titleFor(data: AlternativesPage) {
  const name = data.source.name;
  const pricing = new Set(data.facets.pricing.map((p) => p.value));
  const hasFree = pricing.has("free") || pricing.has("freemium");
  const hasPaid = pricing.has("paid") || pricing.has("subscription") || pricing.has("one-time-purchase");
  const suffix = hasFree && hasPaid ? " (Free & Paid)" : hasFree ? " (Free)" : "";
  const base = `Best ${name} Alternatives in ${currentYear()}`;
  // Long product names drop the pricing suffix so the <title> stays readable in search results.
  return base.length + suffix.length > 58 ? base : base + suffix;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { filters, data } = await load(slug, await searchParams);
  const base = `/software/${slug}/alternatives`;
  const filtered = hasActiveFilters(filters);
  const page = filters.page ?? 1;
  const category = data.source.primaryCategory?.name.toLowerCase();

  return pageMetadata({
    title: page > 1 ? `${titleFor(data)} – Page ${page}` : titleFor(data),
    description: `Compare ${plural(data.totalAlternatives, "alternative")} to ${data.source.name}${category ? ` for ${category}` : ""}, including free and open-source apps like ${data.source.name}. See features, pricing, platforms and license side by side, ranked transparently.`,
    path: base,
    // Filtered/sorted views consolidate to the base URL; paginated pages keep a self-canonical.
    canonical: filtered ? base : page > 1 ? `${base}?page=${page}` : base,
    noindex: filtered || !data.isIndexable,
  });
}

function SignalBreakdown({ item, sourceName }: { item: AlternativeItem; sourceName: string }) {
  return (
    <details className="group text-xs text-muted">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground">
        <span>
          Match score <span className="font-medium tabular-nums text-foreground">{Math.round(item.score)}/100</span>
        </span>
        <span className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2">
          <Info className="size-3.5" aria-hidden="true" /> How is this calculated?
        </span>
      </summary>
      <div className="mt-2 max-w-md rounded-md border border-border bg-surface-secondary p-3">
        <p className="mb-2">
          How closely this product matches {sourceName} — not a quality rating. Each signal is scored 0–100% and weighted:
        </p>
        <dl className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1">
          <dt className="font-medium text-foreground">Signal</dt>
          <dd className="font-medium text-foreground">Value</dd>
          <dd className="font-medium text-foreground">Weight</dd>
          {item.signals.map((sg) => (
            <div key={sg.name} className="contents">
              <dt>{SIGNAL_LABELS[sg.name] ?? sg.name}</dt>
              <dd className="tabular-nums">{Math.round(sg.value * 100)}%</dd>
              <dd className="tabular-nums">{Math.round(sg.weight * 100)}%</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

function AlternativeCard({ item, rank, sourceSlug, sourceName, signedIn }: { item: AlternativeItem; rank: number; sourceSlug: string; sourceName: string; signedIn: boolean }) {
  const app = item.application;
  const compareSlug = [sourceSlug, app.slug].sort().join("-vs-");
  const meta = [pricingSummary(app), app.license?.name, app.platforms.length > 0 ? platformSummary(app.platforms, 4) : null].filter(Boolean);
  return (
    <li className="rounded-[10px] border border-border bg-surface">
      <div className="flex gap-4 p-4 sm:p-5">
        <span className="hidden w-6 pt-3 text-right text-sm tabular-nums text-muted sm:block" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
        <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-semibold sm:text-lg">
              <Link href={`/software/${app.slug}`} className="hover:underline">
                {app.name}
              </Link>
            </h2>
            {item.pinned ? (
              <span className={chipClass("accent", "soft", "sm")}>Editor&apos;s pick</span>
            ) : (
              <AlternativeRelationshipBadge source={item.source} />
            )}
          </div>
          {meta.length > 0 && <p className="mt-0.5 text-xs text-muted">{meta.join(" · ")}</p>}
          <p className="mt-2 text-[15px] text-foreground/85">{app.shortDescription}</p>

          {item.reasons.length > 0 && (
            <div className="mt-3">
              <h3 className="eyebrow mb-1">Why consider it</h3>
              <ul className="flex flex-col gap-0.5 text-sm text-foreground/80">
                {item.reasons.slice(0, 4).map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.sharedFeatures.length > 0 && (
            <p className="mt-2 text-xs text-muted">Also has: {item.sharedFeatures.slice(0, 6).join(", ")}</p>
          )}
          {item.note && <p className="mt-2 text-sm italic text-foreground/75">“{item.note}”</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <SignalBreakdown item={item} sourceName={sourceName} />
        <div className="flex items-center gap-1">
          <AlternativeVoteButton relationshipId={item.relationshipId} count={item.voteCount} path={`/software/${sourceSlug}/alternatives`} signedIn={signedIn} />
          <Link href={`/compare/${compareSlug}`} className={buttonClass("ghost", "sm")}>
            <Scale className="size-4" aria-hidden="true" /> Compare
          </Link>
          <Link href={`/software/${app.slug}`} className={buttonClass("outline", "sm")}>
            Details <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

export default async function AlternativesPageRoute({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const { filters, data } = await load(slug, raw);
  const source = data.source;
  const results = data.results;
  const offset = (results.page - 1) * results.pageSize;

  const groups: FilterGroup[] = [
    { param: "platform", label: "Platform", options: data.facets.platforms },
    { param: "pricing", label: "Pricing", options: data.facets.pricing },
    { param: "license", label: "License", options: data.facets.licenses },
    { param: "feature", label: "Features", options: data.facets.features },
  ];
  const toggles: ToggleOption[] = ATTRIBUTE_OPTIONS.flatMap((a) => {
    const facet = data.facets.attributes.find((f) => f.value === a.value);
    return facet ? [{ param: a.param, label: a.label, count: facet.count }] : [];
  });

  const user = await getCurrentUser();

  return (
    <Container className="py-6">
      <JsonLd data={itemListJsonLd(`${source.name} alternatives`, results.items.map((i) => i.application), offset)} />
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          { name: source.name, path: `/software/${source.slug}` },
          { name: "Alternatives", path: `/software/${source.slug}/alternatives` },
        ]}
      />

      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <ApplicationLogo name={source.name} logoUrl={source.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titleFor(data)}</h1>
          <p className="mt-1 text-sm text-muted">
            {plural(data.totalAlternatives, "alternative")} to{" "}
            <Link href={`/software/${source.slug}`} className="font-medium text-foreground hover:underline">
              {source.name}
            </Link>
            , curated by editors and the community. {source.shortDescription}
          </p>
        </div>
      </header>

      <SponsoredSlot slot={`alternatives:${source.slug}`} className="mt-6" />

      <div className="mt-6 flex gap-8">
        <Suspense>
          <FilterSidebar groups={groups} toggles={toggles} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {hasActiveFilters(filters)
                ? `${plural(results.totalCount, "match", "matches")} of ${data.totalAlternatives}`
                : `Showing ${plural(results.totalCount, "alternative")}`}
            </p>
            <div className="flex items-center gap-2">
              <Suspense>
                <MobileFilterDrawer groups={groups} toggles={toggles} />
                <SortSelector options={SORT_OPTIONS} defaultValue="relevance" />
              </Suspense>
            </div>
          </div>

          {results.items.length === 0 ? (
            <EmptyState
              title={data.totalAlternatives === 0 ? `No alternatives to ${source.name} yet` : "No alternatives match these filters"}
              action={
                data.totalAlternatives > 0 ? (
                  <Link href={`/software/${source.slug}/alternatives`} className={buttonClass("secondary", "sm")}>
                    Clear filters
                  </Link>
                ) : undefined
              }
            >
              {data.totalAlternatives === 0
                ? "Editors have not mapped alternatives for this app yet."
                : "Try removing a filter to see more results."}
            </EmptyState>
          ) : (
            <ol className="flex flex-col gap-3">
              {results.items.map((item, i) => (
                <AlternativeCard key={item.relationshipId} item={item} rank={offset + i + 1} sourceSlug={source.slug} sourceName={source.name} signedIn={!!user} />
              ))}
            </ol>
          )}

          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            hrefFor={(p) => pageHref(`/software/${source.slug}/alternatives`, raw, p)}
          />

          {!hasActiveFilters(filters) && results.page === 1 && (
            <AlternativesIntents sourceSlug={source.slug} sourceName={source.name} items={results.items} />
          )}

          <div className="mt-8">
            <SuggestAlternativeForm slug={source.slug} name={source.name} signedIn={!!user} />
          </div>

          <p className="mt-8 text-xs text-muted">
            How ranking works: each alternative gets a transparent match score from community votes, feature overlap,
            platform compatibility, category relevance, review ratings, data freshness and an editorial score. Products marked
            “Editor&apos;s pick” are placed first by our editors. Sponsored placements never affect this order.
          </p>
        </div>
      </div>
    </Container>
  );
}
