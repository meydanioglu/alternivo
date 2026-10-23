import { ArrowRight, ChevronLeft, ChevronRight, History, Rocket, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { RankedRow } from "@/components/launches/launch-list";
import { Countdown } from "@/components/launches/launch-parts";
import { buttonClass } from "@/components/ui/styles";
import { api, isNotFound } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ week?: string }> };

const weekNumber = (key: string) => key.split("-W")[1]?.replace(/^0/, "") ?? key;
const range = (start: string, end: string) => {
  const f = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f.format(new Date(start))} – ${f.format(new Date(new Date(end).getTime() - 1))}`;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { week } = await searchParams;
  return {
    ...pageMetadata({
      title: week ? `Product launches — week ${weekNumber(week)}` : "This week's product launches",
      description: `New software and AI tools launched on ${site.name} this week, ranked by community upvotes.`,
      path: "/launches",
    }),
    ...(week ? { robots: { index: false } } : {}),
  };
}

export default async function LaunchesPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const [data, user] = await Promise.all([
    api.launches(week).catch((e: unknown) => {
      if (isNotFound(e)) return null;
      throw e;
    }),
    getCurrentUser(),
  ]);
  if (!data) notFound();

  return (
    <Container className="py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] [&>*]:min-w-0">
        <div className="min-w-0">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-accent">Launch board · Week {weekNumber(data.week)}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {data.isCurrent ? "This week's launches" : `Launches of ${range(data.startsAt, data.endsAt)}`}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {data.isCurrent
                  ? "New products compete all week. Upvote your favourites — the top three win the week."
                  : "Final results. Only upvotes cast during the week count."}
              </p>
            </div>
            {data.isCurrent && <Countdown endsAt={data.endsAt} />}
          </header>

          {data.items.length === 0 ? (
            <EmptyState
              title={data.isCurrent ? "No launches yet this week" : "No launches this week"}
              action={
                <Link href="/submit" className={buttonClass("primary", "sm", "mt-2")}>
                  <Rocket className="size-4" aria-hidden="true" /> Launch your product
                </Link>
              }
            >
              Products approved from community submissions appear here in the week they go live.
            </EmptyState>
          ) : (
            <ol className="flex flex-col gap-2">
              {data.items.map((item) => (
                <RankedRow
                  key={item.application.id}
                  rank={item.rank}
                  app={item.application}
                  votes={item.votes}
                  signedIn={!!user}
                  votingOpen={data.isCurrent}
                />
              ))}
            </ol>
          )}

          <nav aria-label="Weeks" className="mt-8 flex items-center justify-between">
            {data.previousWeek ? (
              <Link href={`/launches?week=${data.previousWeek}`} className={buttonClass("ghost", "sm")}>
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous week
              </Link>
            ) : (
              <span />
            )}
            {data.nextWeek && (
              <Link href={`/launches?week=${data.nextWeek}`} className={buttonClass("ghost", "sm")}>
                Next week <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </nav>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl bg-accent p-5 text-accent-foreground">
            <Rocket className="size-6" aria-hidden="true" />
            <h2 className="mt-2 font-semibold">Launch your product</h2>
            <p className="mt-1 text-sm opacity-85">Submit it for free. Once approved it competes in that week&apos;s board.</p>
            <Link
              href="/submit"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-accent hover:bg-white/90"
            >
              Submit <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
          <Link href="/launches/archive" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/50">
            <History className="size-5 text-accent" aria-hidden="true" />
            <span className="text-sm font-medium">Past weeks &amp; winners</span>
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/50">
            <Trophy className="size-5 text-accent" aria-hidden="true" />
            <span className="text-sm font-medium">All-time leaderboard</span>
          </Link>
          <section className="rounded-xl border border-border p-4 text-sm text-muted">
            <h2 className="mb-2 font-semibold text-foreground">How it works</h2>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>Weeks run Monday to Sunday (UTC).</li>
              <li>Each member can upvote a product once.</li>
              <li>Only upvotes cast during the launch week count toward its rank.</li>
            </ul>
          </section>
        </aside>
      </div>
    </Container>
  );
}
