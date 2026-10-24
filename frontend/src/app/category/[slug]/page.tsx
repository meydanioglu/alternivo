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
import { chipClass } from "@/components/ui/styles";

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

      <header className="mt-4 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
          <CategoryIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Best {category.name} software</h1>
          <p className="mt-1 text-sm text-muted">{category.applicationCount} apps</p>
        </div>
      </header>

      {showIntro && (category.seoIntro ?? category.description) && (
        <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-foreground/85">{category.seoIntro ?? category.description}</p>
      )}

      {category.children.length > 0 && (
        <nav aria-label="Subcategories" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {category.children
              .filter((c) => c.applicationCount > 0)
              .map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className={chipClass("default", "secondary", "md", "hover:underline")}>
                    {c.name} <span className="text-muted">{c.applicationCount}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      )}

      {showIntro && category.featured.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Editor’s picks" description="Highest editorial scores in this category." />
          <ApplicationGrid apps={category.featured} />
        </section>
      )}

      <SponsoredSlot slot={`category:${category.slug}`} className="mt-8" />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">All {category.name.toLowerCase()} apps</h2>
        <CatalogListing
          basePath={`/category/${category.slug}`}
          raw={raw}
          filters={filters}
          fixed={{ category: category.slug }}
          listName={`${category.name} software`}
        />
      </section>

      {(category.comparisons.length > 0 || category.related.length > 0) && (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {category.comparisons.length > 0 && (
            <section>
              <SectionHeader title={`Popular ${category.name.toLowerCase()} comparisons`} />
              <ul className="flex flex-col gap-2">
                {category.comparisons.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/compare/${c.slug}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-accent/50"
                    >
                      {c.applications.map((a) => a.name).join(" vs ")}
                      <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {category.related.length > 0 && (
            <section>
              <SectionHeader title="Related categories" />
              <ul className="flex flex-wrap gap-2">
                {category.related.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className={chipClass("default", "secondary", "md", "hover:underline")}>
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
