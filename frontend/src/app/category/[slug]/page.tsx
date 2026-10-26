import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { hasActiveFilters, parseFilters, type RawSearchParams } from "@/lib/filters";
import { currentYear } from "@/lib/format";
import { loadOrNotFound } from "@/lib/resolve";
import { pageMetadata } from "@/lib/seo";
import { SponsoredSlot } from "@/components/sponsored/sponsored-slot";
import { ApplicationGrid } from "@/components/catalog/application-card";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { BreadcrumbNavigation, Container, SectionHeader } from "@/components/layout/page-parts";
import { CategoryIcon } from "@/components/ui/icons";
import { BEST_PAGES } from "@/content/best-pages";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

const load = (slug: string) => loadOrNotFound(() => api.category(slug), `/category/${slug}`);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, raw] = await Promise.all([load(slug), searchParams]);
  const filters = parseFilters(raw);
  const page = filters.page ?? 1;
  const base = `/category/${slug}`;
  return pageMetadata({
    title: `Best ${category.name} Software in ${currentYear()}${page > 1 ? ` – Page ${page}` : ""}`,
    description:
      category.description ??
      `Compare the best ${category.name.toLowerCase()} apps by features, pricing, platforms and license.`,
    path: base,
    canonical: hasActiveFilters(filters) ? base : page > 1 ? `${base}?page=${page}` : base,
    // Thin categories (fewer than 3 apps) stay out of the index until they have real content.
    noindex: hasActiveFilters(filters) || category.applicationCount < 3,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const category = await load(slug);
  const showIntro = !hasActiveFilters(filters) && (filters.page ?? 1) === 1;
  const subcategories = category.children.filter((c) => c.applicationCount > 0);
  // Best lists that feature this category's top products (at least two in common) — contextual, not a link farm.
  const featuredSlugs = new Set(category.featured.map((a) => a.slug));
  const bestLists = BEST_PAGES.map((b) => ({ b, overlap: b.apps.filter((x) => featuredSlugs.has(x)).length }))
    .filter((x) => x.overlap >= 2)
    .sort((x, y) => y.overlap - x.overlap)
    .slice(0, 6)
    .map((x) => x.b);

  return (
    <Container className="py-6">
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
          ...(category.parent ? [{ name: category.parent.name, path: `/category/${category.parent.slug}` }] : []),
          { name: category.name, path: `/category/${category.slug}` },
        ]}
      />

      <header className="mt-5 max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <CategoryIcon name={category.icon} className="size-3.5" /> Category · {category.applicationCount} products
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Best {category.name} software</h1>
        {showIntro && (category.seoIntro ?? category.description) && (
          <p className="prose-copy mt-3">{category.seoIntro ?? category.description}</p>
        )}
      </header>

      {subcategories.length > 0 && (
        <nav aria-label="Subcategories" className="mt-5">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {subcategories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="text-foreground/80 hover:text-foreground hover:underline">
                  {c.name} <span className="text-muted">{c.applicationCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {showIntro && category.featured.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Editor’s picks" description="Highest editorial scores in this category." />
          <ApplicationGrid apps={category.featured.slice(0, 8)} />
        </section>
      )}

      <SponsoredSlot slot={`category:${category.slug}`} className="mt-8" />

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">All {category.name.toLowerCase()} software</h2>
        <CatalogListing
          basePath={`/category/${category.slug}`}
          raw={raw}
          filters={filters}
          fixed={{ category: category.slug }}
          listName={`${category.name} software`}
        />
      </section>

      {(category.comparisons.length > 0 || category.related.length > 0 || bestLists.length > 0) && (
        <div className="mt-14 grid gap-10 border-t border-border pt-10 lg:grid-cols-3">
          {category.comparisons.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold tracking-tight">Popular comparisons</h2>
              <ul className="flex flex-col text-sm">
                {category.comparisons.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/compare/${c.slug}`} className="flex items-center justify-between gap-2 py-1.5 text-foreground/80 hover:text-foreground">
                      <span className="truncate">{c.applications.map((a) => a.name).join(" vs ")}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {bestLists.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold tracking-tight">Related best lists</h2>
              <ul className="flex flex-col text-sm">
                {bestLists.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/best/${b.slug}`} className="block py-1.5 text-foreground/80 hover:text-foreground">
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {category.related.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold tracking-tight">Related categories</h2>
              <ul className="flex flex-col text-sm">
                {category.related.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className="block py-1.5 text-foreground/80 hover:text-foreground">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
