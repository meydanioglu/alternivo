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
import { FilterSidebar, MobileFilterDrawer, type FilterGroup } from "@/components/filters/filter-panel";
import { SortSelector } from "@/components/filters/sort-selector";
import { EmptyState, Pagination, pageHref } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClass } from "@/components/ui/styles";

const PAGE_SIZE = 24;
const LIST_SORTS = SORT_OPTIONS.map((o) => (o.value === "relevance" ? { value: "relevance", label: "Popular" } : o));

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

  return (
    <div className="flex gap-8">
      <JsonLd data={itemListJsonLd(listName, result.items, (result.page - 1) * result.pageSize)} />
      <Suspense>
        <FilterSidebar groups={groups} toggles={toggles} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {plural(result.totalCount, "app")}
          </p>
          <div className="flex items-center gap-2">
            <Suspense>
              <MobileFilterDrawer groups={groups} toggles={toggles} />
              {showSort && <SortSelector options={LIST_SORTS} defaultValue="relevance" />}
            </Suspense>
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
        ) : (
          <ApplicationGrid apps={result.items} />
        )}
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => pageHref(basePath, raw, p)} />
      </div>
    </div>
  );
}
