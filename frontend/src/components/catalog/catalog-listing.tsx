import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/lib/api/client";
import {
  ATTRIBUTE_OPTIONS,
  filtersToQuery,
  hasActiveFilters,
  LICENSE_OPTIONS,
  PRICING_OPTIONS,
  SORT_OPTIONS,
  type CatalogFilters,
  type RawSearchParams,
} from "@/lib/filters";
import { plural } from "@/lib/format";
import { itemListJsonLd } from "@/lib/seo";
import { ApplicationGrid } from "./application-card";
import { SoftwareList } from "./software-row";
import { FilterSidebar, MobileFilterDrawer, type FilterGroup } from "@/components/filters/filter-panel";
import { SortSelector } from "@/components/filters/sort-selector";
import { EmptyState, Pagination, pageHref } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClass, cx } from "@/components/ui/styles";

const PAGE_SIZE = 24;
const LIST_SORTS = SORT_OPTIONS.map((o) => (o.value === "relevance" ? { value: "relevance", label: "Popular" } : o));

/** Link to the same listing with one query parameter changed (page resets). */
function withParam(basePath: string, raw: RawSearchParams, key: string, value: string | null) {
  const next: RawSearchParams = { ...raw, page: undefined, [key]: value ?? undefined };
  return pageHref(basePath, next, 1);
}

/** Shared server-rendered listing with URL-driven filters, used by /software, /category/*, /new-apps, /trending. */
export async function CatalogListing({
  basePath,
  raw,
  filters,
  fixed = {},
  listName,
  showSort = true,
}: {
  basePath: string;
  raw: RawSearchParams;
  filters: CatalogFilters;
  fixed?: { category?: string; sort?: string };
  listName: string;
  showSort?: boolean;
}) {
  const [result, platforms] = await Promise.all([
    api.applications({ ...filtersToQuery(filters, PAGE_SIZE), ...fixed }),
    api.platforms(),
  ]);

  const groups: FilterGroup[] = [
    { param: "platform", label: "Platform", options: platforms.map((p) => ({ value: p.slug, label: p.name })) },
    { param: "pricing", label: "Pricing", options: [...PRICING_OPTIONS] },
    { param: "license", label: "License", options: [...LICENSE_OPTIONS] },
  ];
  const toggles = ATTRIBUTE_OPTIONS.map((a) => ({ param: a.param, label: a.label }));
  const view = raw.view === "grid" ? "grid" : "list";

  return (
    <div className="flex gap-8">
      <JsonLd data={itemListJsonLd(listName, result.items, (result.page - 1) * result.pageSize)} />
      <Suspense>
        <FilterSidebar groups={groups} toggles={toggles} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-3 text-sm text-muted" aria-live="polite">
            {plural(result.totalCount, "app")}
            {hasActiveFilters(filters) && (
              <Link href={basePath} className="text-accent hover:underline">
                Clear filters
              </Link>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Suspense>
              <MobileFilterDrawer groups={groups} toggles={toggles} />
              {showSort && <SortSelector options={LIST_SORTS} defaultValue="relevance" />}
            </Suspense>
            {/* View preference lives in the URL; canonical stays on the base listing, so no duplicate pages are indexed. */}
            <div className="hidden overflow-hidden rounded-md border border-border sm:flex" role="group" aria-label="View">
              <Link
                href={withParam(basePath, raw, "view", null)}
                aria-current={view === "list" ? "true" : undefined}
                aria-label="List view"
                className={cx("grid size-8 place-items-center", view === "list" ? "bg-surface-secondary text-foreground" : "text-muted hover:text-foreground")}
              >
                <List className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={withParam(basePath, raw, "view", "grid")}
                aria-current={view === "grid" ? "true" : undefined}
                aria-label="Grid view"
                className={cx("grid size-8 place-items-center border-l border-border", view === "grid" ? "bg-surface-secondary text-foreground" : "text-muted hover:text-foreground")}
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        {result.items.length === 0 ? (
          <EmptyState
            title="No software matches these filters"
            action={
              hasActiveFilters(filters) ? (
                <Link href={basePath} className={buttonClass("secondary", "sm")}>
                  Clear filters
                </Link>
              ) : undefined
            }
          >
            Try removing a filter or searching instead.
          </EmptyState>
        ) : view === "grid" ? (
          <ApplicationGrid apps={result.items} />
        ) : (
          <SoftwareList apps={result.items} />
        )}
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => pageHref(basePath, raw, p)} />
      </div>
    </div>
  );
}
