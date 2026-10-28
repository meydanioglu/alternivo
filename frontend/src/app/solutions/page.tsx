import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { SolutionSearch } from "@/components/solutions/solution-search";
import { BEST_PAGES } from "@/content/best-pages";
import { publishedSolutions } from "@/content/solutions/pages";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { SOLUTION_TOPICS, topicOf } from "@/lib/solutions";

/** The hub is indexable once it links to enough researched pages to be useful on its own. */
const MIN_INDEXABLE = 3;

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Software solutions for specific problems",
    description:
      "Find software that solves a specific problem: country eligibility, payout options, pricing limits and features checked against official sources.",
    path: "/solutions",
    noindex: publishedSolutions().length < MIN_INDEXABLE,
  });
}

export default function SolutionsHub() {
  const pages = publishedSolutions();
  const items = pages.map((p) => ({ slug: p.slug, title: p.title, category: topicOf(p)?.category ?? "Other", description: p.description }));
  const categories = [...new Set(SOLUTION_TOPICS.map((t) => t.category))].filter((c) => items.some((i) => i.category === c));
  const recent = [...pages].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
  const inResearch = SOLUTION_TOPICS.length - pages.length;

  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Solutions", path: "/solutions" }]} />
      <header className="mt-5 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Software for your specific problem</h1>
        <p className="prose-copy mt-3">
          Each page starts from a real constraint, such as where you live, what you sell or what you can spend, and checks which tools
          actually meet it. Every requirement is checked against the provider&apos;s own pages, and anything we could not confirm is marked as
          not verified.
        </p>
      </header>

      <section className="mt-8">
        <SolutionSearch items={items} categories={categories} />
      </section>

      {recent.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight">Recently verified</h2>
          <ul className="mt-2 divide-y divide-border border-y border-border text-sm">
            {recent.map((p) => (
              <li key={p.slug} className="flex justify-between gap-4 py-2.5">
                <Link href={`/solutions/${p.slug}`} className="hover:underline">{p.title}</Link>
                <span className="shrink-0 text-muted">{formatDate(p.updated)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 max-w-3xl text-sm text-muted">
        <p>
          {inResearch} more problems are being researched and will be published once their facts are verified. Meanwhile, browse our{" "}
          <Link href="/best" className="underline">best lists</Link>, <Link href="/categories" className="underline">categories</Link> or{" "}
          <Link href="/compare" className="underline">comparisons</Link>.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {BEST_PAGES.slice(0, 6).map((b) => <li key={b.slug}><Link href={`/best/${b.slug}`} className="hover:text-foreground hover:underline">{b.title}</Link></li>)}
        </ul>
      </section>
    </Container>
  );
}
