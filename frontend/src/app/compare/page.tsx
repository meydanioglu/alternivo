import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { pageMetadata } from "@/lib/seo";
import { CompareBuilder } from "@/components/compare/compare-builder";
import { BreadcrumbNavigation, Container, SectionHeader } from "@/components/layout/page-parts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Compare Software Side by Side",
  description: "Compare apps side by side: pricing, license, platforms, self-hosting and features, based on catalogue data.",
  path: "/compare",
});

export default async function ComparePage() {
  const popular = await api.popularComparisons();

  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Compare", path: "/compare" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Compare software</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm text-muted">
        Pick two apps to see pricing, license, platforms and features side by side. Every row comes from catalogue data —
        nothing is generated.
      </p>
      <CompareBuilder />

      {popular.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Popular comparisons" />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-accent/50"
                >
                  <span className="truncate">{c.applications.map((a) => a.name).join(" vs ")}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 max-w-3xl text-sm leading-relaxed text-muted">
        <h2 className="mb-2 text-base font-semibold text-foreground">How comparisons work</h2>
        <p>
          A comparison puts two listings next to each other row by row: pricing model, license, whether the app can be self-hosted,
          the platforms it runs on, the features each one has, and how the community rates it. Shared features are shown first so you
          can see where the apps overlap, then the features only one of them offers, which is usually where the decision is made.
        </p>
        <p className="mt-3">
          Every value comes from the same catalogue data as the product pages, and moderators check submissions and corrections before
          they are published. If something looks wrong, use the report link on the product page and we will fix it. To find more
          candidates first, open any product&apos;s alternatives page, which ranks similar apps by shared features, platform fit and votes.
        </p>
      </section>
    </Container>
  );
}
