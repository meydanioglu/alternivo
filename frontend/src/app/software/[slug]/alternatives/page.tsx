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
import { CommunityStats } from "@/components/catalog/application-card";
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
  return `Best ${name} Alternatives in ${currentYear()}${suffix}`;
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

function SignalBreakdown({ item }: { item: AlternativeItem }) {
  return (
    <details className="group text-xs text-muted">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-foreground">
        <Info className="size-3.5" aria-hidden="true" />
        Match score {Math.round(item.score)}
        <span className="sr-only">— show how this was calculated</span>
      </summary>
      <dl className="mt-2 grid max-w-sm grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 rounded-md border border-border bg-surface-secondary p-2">
        <dt className="font-medium text-foreground">Signal</dt>
        <dd className="font-medium text-foreground">Value</dd>
        <dd className="font-medium text-foreground">Weight</dd>
        {item.signals.map((s) => (
          <div key={s.name} className="contents">
            <dt>{SIGNAL_LABELS[s.name] ?? s.name}</dt>
            <dd className="tabular-nums">{Math.round(s.value * 100)}%</dd>
            <dd className="tabular-nums">{Math.round(s.weight * 100)}%</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function AlternativeCard({ item, rank, sourceSlug, sourceName, signedIn }: { item: AlternativeItem; rank: number; sourceSlug: string; sourceName: string; signedIn: boolean }) {
  const app = item.application;
  const compareSlug = [sourceSlug, app.slug].sort().join("-vs-");
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-muted" aria-label={`Rank ${rank}`}>
            #{rank}
          </span>
          <AlternativeVoteButton
            relationshipId={item.relationshipId}
            count={item.voteCount}
            path={`/software/${sourceSlug}/alternatives`}
            signedIn={signedIn}
          />
        </div>
        <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">
              <Link href={`/software/${app.slug}`} className="hover:underline">
                {app.name}
              </Link>
            </h2>
            <CommunityStats app={app} />
            <AlternativeRelationshipBadge source={item.source} />
            {item.pinned && <span className={chipClass("accent", "soft", "sm")}>Editor&apos;s pick</span>}
          </div>
          <p className="mt-1 text-sm text-foreground/85">{app.shortDescription}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <PricingBadge pricing={app.pricing} />
            <LicenseBadge license={app.license} />
            <AttributeBadges app={app} />
          </div>
          <div className="mt-2">
            <PlatformList platforms={app.platforms} max={6} />
          </div>

          {item.reasons.length > 0 && (
            <div className="mt-3">
              <h3 className="sr-only">Why choose {app.name} over {sourceName}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {item.reasons.map((r) => (
                  <li key={r} className={chipClass("accent", "soft")}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.sharedFeatures.length > 0 && (
            <p className="mt-2 text-xs text-muted">Shared features: {item.sharedFeatures.join(", ")}</p>
          )}
          {item.note && <p className="mt-2 text-sm italic text-foreground/75">“{item.note}”</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <SignalBreakdown item={item} />
            <div className="flex gap-2">
              <Link href={`/compare/${compareSlug}`} className={buttonClass("ghost", "sm")}>
                <Scale className="size-4" aria-hidden="true" /> Compare
              </Link>
              <Link href={`/software/${app.slug}`} className={buttonClass("secondary", "sm")}>
                Details <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
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
