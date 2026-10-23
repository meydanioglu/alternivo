import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { pageMetadata } from "@/lib/seo";
import { ApplicationGrid } from "@/components/catalog/application-card";
import { Container, EmptyState, Pagination } from "@/components/layout/page-parts";
import { SearchCommand } from "@/components/search/search-command";
import { chipClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = first((await searchParams).q)?.trim();
  // Internal search results are never indexed.
  return pageMetadata({
    title: q ? `Search results for “${q.slice(0, 60)}”` : "Search software",
    description: "Search the software catalogue by name, alias, category or tag.",
    path: "/search",
    noindex: true,
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(first(params.page) ?? "1", 10) || 1));
  const result = q ? await api.search(q, page) : null;

  return (
    <Container className="py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{q ? <>Results for “{q}”</> : "Search software"}</h1>
      <div className="mt-4 max-w-2xl">
        <SearchCommand size="lg" placeholder="Search by name, category or tag" />
      </div>

      {result && (
        <>
          {result.categories.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">Matching categories</h2>
              <ul className="flex flex-wrap gap-2">
                {result.categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className={chipClass("accent", "soft", "md", "hover:underline")}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {result.applications.totalCount} {result.applications.totalCount === 1 ? "app" : "apps"} found
            </p>
            {result.applications.items.length > 0 ? (
              <ApplicationGrid apps={result.applications.items} />
            ) : (
              <EmptyState title={`Nothing found for “${q}”`}>
                Check the spelling, try a broader term, or{" "}
                <Link href="/categories" className="underline">
                  browse categories
                </Link>
                .
              </EmptyState>
            )}
            <Pagination
              page={result.applications.page}
              totalPages={result.applications.totalPages}
              hrefFor={(p) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ""}`}
            />
          </section>
        </>
      )}
    </Container>
  );
}
