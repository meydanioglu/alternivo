import { ArrowRight, MessageSquareQuote, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { api } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { pageMetadata, websiteJsonLd } from "@/lib/seo";
import { ApplicationGrid, CompactApplicationRow } from "@/components/catalog/application-card";
import { ReviewCard } from "@/components/catalog/review-card";
import { Container, SectionHeader } from "@/components/layout/page-parts";
import { SearchCommand } from "@/components/search/search-command";
import { JsonLd } from "@/components/seo/json-ld";
import { CategoryIcon } from "@/components/ui/icons";
import { buttonClass, chipClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: `${site.name} — Find Better Alternatives to Any Software`,
  description: site.description,
  path: "/",
});

const EXAMPLE_SEARCHES = [
  { label: "Photoshop alternatives", href: "/software/photoshop/alternatives" },
  { label: "Notion alternatives", href: "/software/notion/alternatives" },
  { label: "ChatGPT alternatives", href: "/software/chatgpt/alternatives" },
  { label: "Free Figma alternatives", href: "/software/figma/alternatives?pricing=free&pricing=freemium" },
  { label: "Open-source software", href: "/software?license=open-source" },
];

function AppSection({ title, description, href, apps }: { title: string; description?: string; href?: string; apps: ApplicationSummary[] }) {
  if (apps.length === 0) return null;
  return (
    <section className="py-8">
      <SectionHeader title={title} description={description} href={href} />
      <ApplicationGrid apps={apps} />
    </section>
  );
}

export default async function HomePage() {
  const home = await api.home();

  return (
    <>
      <JsonLd data={websiteJsonLd()} />

      <section className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">Find Better Alternatives to Any Software</h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted sm:text-lg">
              Discover, compare, and choose the best apps, software, and AI tools — with transparent rankings and real
              pricing and platform details.
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchCommand size="lg" placeholder="Search for an app you want to replace…" />
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Example searches">
              {EXAMPLE_SEARCHES.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className={chipClass("default", "secondary", "md", "hover:underline")}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
            {[
              ["Apps listed", home.stats.applications],
              ["Categories", home.stats.categories],
              ["Alternatives mapped", home.stats.alternatives],
              ["Community reviews", home.stats.reviews],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{formatNumber(value as number)}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container>
        {home.popularSearches.length > 0 && (
          <section className="pt-8">
            <SectionHeader title="Popular searches" description="What people searched for in the last 30 days." />
            <ul className="flex flex-wrap gap-2">
              {home.popularSearches.map((s) => (
                <li key={s.query}>
                  <Link href={`/search?q=${encodeURIComponent(s.query)}`} className={chipClass("default", "secondary", "md")}>
                    {s.query}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <AppSection
          title="Popular picks"
          description="Ranked by community likes, with editor ratings as a tie-breaker."
          href="/trending"
          apps={home.trending}
        />

        <section className="my-4 flex flex-col items-start gap-4 overflow-hidden rounded-2xl bg-accent p-6 text-accent-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
              <Rocket className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">Building something people should switch to?</h2>
              <p className="text-sm opacity-85">Submit your product for free and get listed as an alternative to the apps people already use.</p>
            </div>
          </div>
          <Link href="/submit" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-accent hover:bg-white/90">
            Submit your product <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        {home.featuredCategories.length > 0 && (
          <section className="py-8">
            <SectionHeader title="Browse by category" href="/categories" linkLabel="All categories" />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {home.featuredCategories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-accent/50"
                  >
                    <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground">
                      <CategoryIcon name={c.icon} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="text-xs text-muted">{c.applicationCount} apps</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <AppSection title="AI tools" href="/category/ai-tools" apps={home.aiTools} />
        <AppSection title="Popular open-source software" href="/software?license=open-source" apps={home.openSource} />
        <AppSection title="Best free software" href="/software?pricing=free" apps={home.free} />
        <AppSection
          title="Community favorites"
          description="The most-liked apps by signed-in members."
          href="/trending"
          apps={home.communityFavorites}
        />

        <div className="grid gap-8 py-8 lg:grid-cols-2">
          {home.recentlyAdded.length > 0 && (
            <section>
              <SectionHeader title="Recently added" href="/new-apps" />
              <ul className="rounded-lg border border-border bg-surface p-2">
                {home.recentlyAdded.map((app) => (
                  <CompactApplicationRow key={app.id} app={app} />
                ))}
              </ul>
            </section>
          )}
          {home.comparisons.length > 0 && (
            <section>
              <SectionHeader title="Popular comparisons" href="/compare" />
              <ul className="grid gap-2 sm:grid-cols-2">
                {home.comparisons.map((c) => (
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
        </div>

        {home.newlyReleased.length > 0 && (
          <section className="py-8">
            <SectionHeader title="Release history" description="Listed apps with a known first public release date, newest first." />
            <ul className="grid gap-2 rounded-lg border border-border bg-surface p-2 sm:grid-cols-2">
              {home.newlyReleased.map((app) => (
                <CompactApplicationRow key={app.id} app={app} />
              ))}
            </ul>
          </section>
        )}

        {home.recentReviews.length > 0 && (
          <section className="py-8">
            <SectionHeader title="Latest community reviews" />
            <div className="grid gap-3 lg:grid-cols-2">
              {home.recentReviews.map((r) => (
                <ReviewCard key={r.id} review={r} showApplication />
              ))}
            </div>
          </section>
        )}

        <section className="my-8 flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MessageSquareQuote className="mt-0.5 size-6 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold">Looking for something specific?</h2>
              <p className="text-sm text-muted">Filter the full catalogue by platform, pricing, license and more.</p>
            </div>
          </div>
          <Link href="/software" className={buttonClass("primary", "md")}>
            Browse all software
          </Link>
        </section>
      </Container>
    </>
  );
}
