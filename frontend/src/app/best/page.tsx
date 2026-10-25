import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { BEST_PAGES, type BestGroup, GROUP_LABELS } from "@/content/best-pages";
import { GUIDES } from "@/content/guides";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Best AI tools by use case",
  description: "Curated lists of the best AI game makers, app builders, coding tools, agents and creative tools, plus practical how-to guides.",
  path: "/best",
});

export default function BestIndexPage() {
  const groups = Object.keys(GROUP_LABELS) as BestGroup[];
  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Best lists", path: "/best" }]} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Best AI tools by use case</h1>
      <p className="mt-2 max-w-2xl text-muted">Editorial lists for specific jobs. Each list explains how products were chosen; paid placements never affect them.</p>
      {groups.map((g) => (
        <section key={g} className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">{GROUP_LABELS[g]}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BEST_PAGES.filter((p) => p.group === g).map((p) => (
              <li key={p.slug}>
                <Link href={`/best/${p.slug}`} className="block rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-accent/50">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Guides</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="block rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-accent/50">
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
