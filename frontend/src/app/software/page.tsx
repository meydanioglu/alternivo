import type { Metadata } from "next";
import { hasActiveFilters, parseFilters, type RawSearchParams } from "@/lib/filters";
import { pageMetadata } from "@/lib/seo";
import { CatalogListing } from "@/components/catalog/catalog-listing";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const page = filters.page ?? 1;
  return pageMetadata({
    title: page > 1 ? `All Software – Page ${page}` : "All Software: Browse Apps, Tools and Alternatives",
    description: "Browse every app in the catalogue and filter by platform, pricing, license, self-hosting and privacy.",
    path: "/software",
    canonical: hasActiveFilters(filters) ? "/software" : page > 1 ? `/software?page=${page}` : "/software",
    noindex: hasActiveFilters(filters),
  });
}

export default async function SoftwareIndexPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Software", path: "/software" }]} />
      <h1 className="mb-6 mt-4 text-2xl font-bold tracking-tight sm:text-3xl">All software</h1>
      <CatalogListing basePath="/software" raw={raw} filters={filters} listName="All software" />
    </Container>
  );
}
