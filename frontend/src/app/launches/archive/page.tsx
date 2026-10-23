import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { RankBadge } from "@/components/launches/launch-list";
import { api } from "@/lib/api/client";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Launch archive — past weekly winners",
  description: "Every past launch week and its top three products, ranked by community upvotes.",
  path: "/launches/archive",
});

const dateFormat = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function LaunchArchivePage() {
  const weeks = await api.launchArchive();

  return (
    <Container className="max-w-4xl py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <History className="size-7 text-accent" aria-hidden="true" /> Launch archive
      </h1>
      <p className="mt-1 text-muted">Past launch weeks and their winners.</p>

      {weeks.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No finished weeks yet">
            The first results appear here once a launch week ends.{" "}
            <Link href="/launches" className="text-accent hover:underline">
              See this week&apos;s board
            </Link>
            .
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-8 flex flex-col gap-4">
          {weeks.map((w) => (
            <li key={w.week} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  <Link href={`/launches?week=${w.week}`} className="hover:underline">
                    Week of {dateFormat.format(new Date(w.startsAt))}
                  </Link>
                </h2>
                <span className="text-xs text-muted">{w.launchCount} launches</span>
              </div>
              <ol className="grid gap-2 sm:grid-cols-3">
                {w.winners.map((item) => (
                  <li key={item.application.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                    <RankBadge rank={item.rank} />
                    <ApplicationLogo name={item.application.name} logoUrl={item.application.logoUrl} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/software/${item.application.slug}`} className="block truncate text-sm font-medium hover:underline">
                        {item.application.name}
                      </Link>
                      <span className="text-xs text-muted">{item.votes} votes</span>
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
