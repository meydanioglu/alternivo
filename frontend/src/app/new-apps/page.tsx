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
    title: "New Apps: Recently Added Software",
    description: "The newest applications added to the catalogue, with pricing, platforms and license at a glance.",
    path: "/new-apps",
    noindex: hasActiveFilters({ ...filters, sort: undefined }) || (filters.page ?? 1) > 1,
  });
}

export default async function NewAppsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "New apps", path: "/new-apps" }]} />
      <h1 className="mb-6 mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Recently added apps</h1>
      <CatalogListing basePath="/new-apps" raw={raw} filters={filters} fixed={{ sort: "newest" }} listName="New apps" showSort={false} />
    </Container>
  );
}
