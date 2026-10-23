import type { Metadata } from "next";
import { hasActiveFilters, parseFilters, type RawSearchParams } from "@/lib/filters";
import { pageMetadata } from "@/lib/seo";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  return pageMetadata({
    title: "Most-Liked Software",
    description: "Apps ranked by likes from signed-in community members.",
    path: "/trending",
    noindex: hasActiveFilters({ ...filters, sort: undefined }) || (filters.page ?? 1) > 1,
  });
}

export default async function TrendingPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Most liked", path: "/trending" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Most-liked software</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Ordered by community likes. Ties are broken by editor score.</p>
      <CatalogListing basePath="/trending" raw={raw} filters={filters} fixed={{ sort: "likes" }} listName="Most-liked software" showSort={false} />
    </Container>
  );
}
