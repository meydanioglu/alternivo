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
      <header className="mb-10 mt-5 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Best AI tools by use case</h1>
        <p className="mt-2 text-[15px] text-muted">
          Editorial lists for specific jobs. Each list explains how products were chosen; paid placements never affect them.
        </p>
      </header>
      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="border-b border-border pb-2 font-medium">{GROUP_LABELS[g]}</h2>
            <ul className="mt-2 flex flex-col text-sm">
              {BEST_PAGES.filter((p) => p.group === g).map((p) => (
                <li key={p.slug}>
                  <Link href={`/best/${p.slug}`} className="block py-1.5 text-foreground/80 hover:text-foreground">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className="border-b border-border pb-2 font-medium">Guides</h2>
          <ul className="mt-2 flex flex-col text-sm">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="block py-1.5 text-foreground/80 hover:text-foreground">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
