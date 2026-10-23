import { Medal } from "lucide-react";
import Link from "next/link";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { cx } from "@/components/ui/styles";
import type { ApplicationSummary } from "@/lib/api/types";
import { LaunchVoteButton } from "./launch-parts";

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-500"];

export function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="grid w-7 shrink-0 place-items-center" aria-label={`Rank ${rank}`}>
        <Medal className={cx("size-5", MEDAL[rank - 1])} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-muted" aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  );
}

export function RankedRow({ rank, app, votes, signedIn, votingOpen, compact }: {
  rank: number;
  app: ApplicationSummary;
  votes: number;
  signedIn: boolean;
  votingOpen: boolean;
  compact?: boolean;
}) {
  return (
    <li className={cx("flex items-center gap-3 rounded-xl border border-border bg-surface transition hover:border-accent/50", compact ? "p-2.5" : "p-4")}>
      <RankBadge rank={rank} />
      <ApplicationLogo name={app.name} logoUrl={app.logoUrl} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <Link href={`/software/${app.slug}`} className="font-semibold hover:underline">
          {app.name}
        </Link>
        <p className={cx("text-sm text-muted", compact ? "truncate" : "line-clamp-2")}>{app.shortDescription}</p>
        {!compact && app.primaryCategory && <p className="mt-1 text-xs text-muted">{app.primaryCategory.name}</p>}
      </div>
      <LaunchVoteButton applicationId={app.id} votes={votes} signedIn={signedIn} disabled={!votingOpen} size={compact ? "sm" : "md"} />
    </li>
  );
}
