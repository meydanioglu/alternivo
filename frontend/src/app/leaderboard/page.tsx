import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { Container, EmptyState, Pagination } from "@/components/layout/page-parts";
import { RankedRow } from "@/components/launches/launch-list";
import { cx } from "@/components/ui/styles";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "month", label: "Last 30 days" },
  { value: "week", label: "Last 7 days" },
] as const;

type Props = { searchParams: Promise<{ period?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { period, page } = await searchParams;
  return {
    ...pageMetadata({
      title: "Leaderboard — the most upvoted software",
      description: `The software and AI tools the ${site.name} community upvotes most, all time and this month.`,
      path: "/leaderboard",
    }),
    ...(period || page ? { robots: { index: false } } : {}),
  };
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const period = PERIODS.find((p) => p.value === params.period)?.value ?? "all";
  const page = Math.max(1, Number(params.page) || 1);
  const [data, user] = await Promise.all([api.leaderboard(period, page), getCurrentUser()]);

  const href = (p: number, per: string = period) => {
    const q = new URLSearchParams();
    if (per !== "all") q.set("period", per);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/leaderboard?${s}` : "/leaderboard";
  };

  return (
    <Container className="max-w-4xl py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <Trophy className="size-7 text-amber-400" aria-hidden="true" /> Leaderboard
      </h1>
      <p className="mt-1 text-muted">The most upvoted software on {site.name}. Upvotes come from signed-in members only.</p>

      <nav aria-label="Period" className="mt-6 inline-flex rounded-lg border border-border bg-surface p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={href(1, p.value)}
            aria-current={period === p.value ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              period === p.value ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {data.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No votes yet">Be the first to upvote an app.</EmptyState>
        </div>
      ) : (
        <ol className="mt-6 flex flex-col gap-2">
          {data.items.map((item) => (
            <RankedRow
              key={item.application.id}
              rank={item.rank}
              app={item.application}
              votes={item.votes}
              signedIn={!!user}
              votingOpen
            />
          ))}
        </ol>
      )}

      <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href(p)} />
    </Container>
  );
}
