import { ArrowRight, LayoutGrid, Rocket, Sparkles, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { CategoryDirectory } from "@/components/catalog/category-directory";
import { Container } from "@/components/layout/page-parts";
import { RankBadge, RankedRow } from "@/components/launches/launch-list";
import { Countdown } from "@/components/launches/launch-parts";
import { SearchCommand } from "@/components/search/search-command";
import { api } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { flattenCategories } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "AI Tools — One place for all things AI",
  description: "Find the best AI tools, agents and models: weekly launches, an upvote leaderboard and every AI category in one place.",
  path: "/ais",
});

const AI_ROOT = "ai-tools";

const TABS = [
  { href: "#now", label: "Now", icon: Sparkles },
  { href: "#launches", label: "Launches", icon: Rocket },
  { href: "#leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "#categories", label: "Categories", icon: LayoutGrid },
];

function Panel({ id, title, subtitle, action, children }: {
  id?: string;
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {title}
          {subtitle && <span className="text-sm font-normal text-muted">{subtitle}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const MoreLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="mt-2 flex items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-medium text-muted hover:bg-surface-secondary hover:text-foreground"
  >
    {children} <ArrowRight className="size-4" aria-hidden="true" />
  </Link>
);

export default async function AisPage() {
  const [tree, launches, archive, leaders, featured, user] = await Promise.all([
    api.categories(),
    api.launches().catch(() => null),
    api.launchArchive().catch(() => []),
    api.leaderboard("all", 1).catch(() => null),
    api.applications({ category: AI_ROOT, sort: "likes", pageSize: 10 }).catch(() => null),
    getCurrentUser(),
  ]);

  const aiRoot = tree.find((c) => c.slug === AI_ROOT);
  const aiCategories = flattenCategories(aiRoot ? [aiRoot] : ([] as Category[])).filter((c) => c.slug !== AI_ROOT);
  const indexed = featured?.totalCount ?? 0;
  const lastWeek = archive[0];
  const leaderItems = (leaders?.items ?? []).slice(0, 9);
  const highlight = featured?.items[0];

  return (
    <>
      {featured && featured.items.length > 0 && <JsonLd data={itemListJsonLd("Featured AI tools", featured.items)} />}
      <section id="now" className="scroll-mt-24 border-b border-border bg-surface">
        <Container className="py-12 text-center sm:py-16">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            One place for all things <span className="text-accent">AI</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tools, agents, models and assistants — ranked by the community, launched every week.
          </p>
          <div className="mx-auto mt-7 max-w-2xl">
            <SearchCommand size="lg" placeholder="Search AIs, categories, alternatives…" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
            <span>
              <strong className="text-foreground">{formatNumber(indexed)}</strong> AIs indexed
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-foreground">{aiCategories.length}</strong> AI categories
            </span>
            {highlight && (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/software/${highlight.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 hover:border-accent/50">
                  Featured
                  <ApplicationLogo name={highlight.name} logoUrl={highlight.logoUrl} size="sm" />
                  <span className="font-medium text-foreground">{highlight.name}</span>
                </Link>
              </>
            )}
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <nav aria-label="Sections" className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ href, label, icon: Icon }, i) => (
            <a
              key={href}
              href={href}
              className={
                i === 0
                  ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background"
                  : "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:bg-surface-secondary hover:text-foreground"
              }
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </a>
          ))}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-10">
            <Panel
              id="launches"
              title={<>Launch board · Week {launches?.week.split("-W")[1]?.replace(/^0/, "")}</>}
              subtitle="This week's competition"
              action={launches?.isCurrent ? <Countdown endsAt={launches.endsAt} /> : undefined}
            >
              {launches && launches.items.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {launches.items.slice(0, 9).map((item) => (
                    <RankedRow key={item.application.id} rank={item.rank} app={item.application} votes={item.votes} signedIn={!!user} votingOpen compact />
                  ))}
                </ol>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  No launches yet this week.{" "}
                  <Link href="/submit" className="font-medium text-accent hover:underline">
                    Launch your AI
                  </Link>
                </div>
              )}
              <MoreLink href="/launches">Continue to full list of this week</MoreLink>
            </Panel>

            <Panel id="leaderboard" title="Leaderboard" subtitle="Top of the community">
              <ol className="flex flex-col gap-2">
                {leaderItems.map((item) => (
                  <RankedRow key={item.application.id} rank={item.rank} app={item.application} votes={item.votes} signedIn={!!user} votingOpen compact />
                ))}
              </ol>
              <MoreLink href="/leaderboard">Continue to leaderboard</MoreLink>
            </Panel>
          </div>

          <aside className="flex flex-col gap-8">
            <Panel title="Last week's winners" action={<Link href="/launches/archive" className="text-sm text-muted hover:text-foreground">Archive →</Link>}>
              {lastWeek && lastWeek.winners.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {lastWeek.winners.map((w) => (
                    <li key={w.application.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
                      <RankBadge rank={w.rank} />
                      <ApplicationLogo name={w.application.name} logoUrl={w.application.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/software/${w.application.slug}`} className="block truncate text-sm font-semibold hover:underline">
                          {w.application.name}
                        </Link>
                        <span className="text-xs text-muted">{w.votes} votes</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                  The first winners are announced when this week ends.
                </p>
              )}
            </Panel>

            {featured && featured.items.length > 0 && (
              <Panel title="Featured AIs">
                <ul className="flex flex-col gap-1">
                  {featured.items.map((app) => (
                    <li key={app.id}>
                      <Link href={`/software/${app.slug}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-secondary">
                        <ApplicationLogo name={app.name} logoUrl={app.logoUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{app.name}</span>
                          <span className="block truncate text-xs text-muted">{app.shortDescription}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <MoreLink href={`/category/${AI_ROOT}`}>All AIs</MoreLink>
              </Panel>
            )}

            <section className="rounded-xl bg-accent p-5 text-accent-foreground">
              <Rocket className="size-6" aria-hidden="true" />
              <h2 className="mt-2 font-semibold">Built an AI tool?</h2>
              <p className="mt-1 text-sm opacity-85">Submit it for free and compete in this week&apos;s launch board.</p>
              <Link href="/submit" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-accent hover:bg-white/90">
                Submit an AI <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
          </aside>
        </div>

        <div className="mt-12">
          <Panel id="categories" title="AI categories" subtitle={`${aiCategories.length} categories`}>
            <CategoryDirectory categories={aiCategories} />
          </Panel>
        </div>
      </Container>
    </>
  );
}
