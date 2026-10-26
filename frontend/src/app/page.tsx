import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { api } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { pageMetadata, websiteJsonLd } from "@/lib/seo";
import { ApplicationGrid } from "@/components/catalog/application-card";
import { SoftwareList } from "@/components/catalog/software-row";
import { SponsoredSlot } from "@/components/sponsored/sponsored-slot";
import { Container, SectionHeader } from "@/components/layout/page-parts";
import { SearchCommand } from "@/components/search/search-command";
import { JsonLd } from "@/components/seo/json-ld";
import { CategoryIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: `${site.name} — Find Better Alternatives to Any Software`,
  description: site.description,
  path: "/",
});

/** High-intent starting points; every link is a real, existing page. */
const POPULAR_ALTERNATIVES = [
  { label: "Photoshop", href: "/software/photoshop/alternatives" },
  { label: "Notion", href: "/software/notion/alternatives" },
  { label: "ChatGPT", href: "/software/chatgpt/alternatives" },
  { label: "Figma", href: "/software/figma/alternatives" },
  { label: "Cursor", href: "/software/cursor/alternatives" },
  { label: "Canva", href: "/software/canva/alternatives" },
];

/** "Explore by need": supported catalogue filters and taxonomy, not invented collections. */
const NEEDS = [
  { title: "Free software", text: "No-cost tools and generous free plans", href: "/software?pricing=free" },
  { title: "Open source", text: "Inspectable code you can fork and self-host", href: "/software?license=open-source" },
  { title: "Self-hosted", text: "Run it on your own servers", href: "/software?selfHosted=true" },
  { title: "AI tools", text: "Assistants, generators and AI agents", href: "/ais" },
  { title: "Developer tools", text: "Editors, coding assistants and devtools", href: "/category/ai-coding-tools" },
  { title: "Productivity", text: "Notes, tasks and knowledge bases", href: "/category/note-taking" },
];

export default async function HomePage() {
  const [home, featured] = await Promise.all([api.home(), api.featured().catch(() => [] as ApplicationSummary[])]);
  const popular = home.trending.slice(0, 8);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />

      {/* Hero: one job — get people searching. */}
      <section className="border-b border-border">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Find better software.</h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted sm:text-lg">
              Discover alternatives, compare features and choose tools that fit the way you work.
            </p>
            <div className="mx-auto mt-8 max-w-xl text-left">
              <SearchCommand size="lg" placeholder="What do you want to replace?" />
            </div>
            <p className="mt-5 text-sm text-muted">
              <span className="mr-2">Popular:</span>
              {POPULAR_ALTERNATIVES.map((s, i) => (
                <span key={s.href} className="whitespace-nowrap">
                  <Link href={s.href} className="text-foreground/80 underline-offset-4 hover:text-foreground hover:underline">
                    {s.label} alternatives
                  </Link>
                  {i < POPULAR_ALTERNATIVES.length - 1 && <span className="mx-1.5 text-border">·</span>}
                </span>
              ))}
            </p>
            <p className="mt-6 text-xs text-muted">
              {formatNumber(home.stats.applications)} products · {formatNumber(home.stats.categories)} categories ·{" "}
              {formatNumber(home.stats.alternatives)} mapped alternatives
            </p>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 py-14">
        {home.popularSearches.length > 0 && (
          <section aria-labelledby="searches">
            <SectionHeader title="What people are searching for" description="Most frequent searches in the last 30 days." />
            <ul className="flex flex-wrap gap-2" id="searches">
              {home.popularSearches.map((s) => (
                <li key={s.query}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="inline-flex rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:border-foreground/25"
                  >
                    {s.query}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="needs">
          <SectionHeader title="Explore by need" />
          <ul className="grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {NEEDS.map((n) => (
              <li key={n.href} className="bg-surface">
                <Link href={n.href} className="group flex h-full items-start justify-between gap-3 p-5 hover:bg-surface-secondary/60">
                  <span>
                    <span className="block font-medium">{n.title}</span>
                    <span className="mt-1 block text-sm text-muted">{n.text}</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted transition-colors group-hover:text-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {popular.length > 0 && (
          <section>
            <SectionHeader title="Popular picks" description="Widely used products across the catalogue." href="/trending" linkLabel="More" />
            <ApplicationGrid apps={popular} />
          </section>
        )}

        <div className="grid gap-12 lg:grid-cols-2">
          {home.comparisons.length > 0 && (
            <section>
              <SectionHeader title="Popular comparisons" href="/compare" linkLabel="All comparisons" />
              <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface">
                {home.comparisons.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/compare/${c.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-secondary/60">
                      <span className="min-w-0 truncate">
                        {c.applications.map((a, i) => (
                          <span key={a.slug}>
                            {i > 0 && <span className="mx-2 text-xs text-muted">vs</span>}
                            <span className="font-medium">{a.name}</span>
                          </span>
                        ))}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {home.recentlyAdded.length > 0 && (
            <section>
              <SectionHeader title="Recently added" href="/new-apps" linkLabel="All new" />
              <SoftwareList apps={home.recentlyAdded.slice(0, 8)} />
            </section>
          )}
        </div>

        {home.featuredCategories.length > 0 && (
          <section>
            <SectionHeader title="Browse categories" href="/categories" linkLabel="All categories" />
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              {home.featuredCategories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-secondary/60">
                    <CategoryIcon name={c.icon} className="size-4 shrink-0 text-muted group-hover:text-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <span className="text-xs tabular-nums text-muted">{c.applicationCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {home.aiTools.length > 0 && (
          <section>
            <SectionHeader title="AI tools" href="/ais" linkLabel="All AI tools" />
            <ApplicationGrid apps={home.aiTools.slice(0, 8)} />
          </section>
        )}

        {(featured.length > 0) && (
          <section>
            <SectionHeader title="Featured" description="Sponsored by makers and always labelled. Featured placements never change rankings." />
            <ApplicationGrid apps={featured} />
          </section>
        )}
        <SponsoredSlot slot="home" title="Spotlight" />

        <section className="flex flex-col gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Building something people should switch to?</h2>
            <p className="mt-1 text-sm text-muted">Submit your product for free. Every listing is reviewed by an editor.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/submit" className={buttonClass("primary", "md")}>
              Submit a product
            </Link>
            <Link href="/pricing" className={buttonClass("ghost", "md")}>
              Maker pricing
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
