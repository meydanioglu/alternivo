"use client";

import { ChevronUp, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setLikeAction } from "@/app/actions";
import { cx } from "@/components/ui/styles";

/** Live countdown to the end of the current launch week. Renders nothing until mounted to avoid hydration drift. */
export function Countdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return null;

  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span
      className={cx("inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold tabular-nums text-warning", className)}
      title="Time left in this week's competition"
    >
      <Timer className="size-3.5" aria-hidden="true" />
      {d}d {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

/** Upvote for a launch. A launch vote is a like on the application; only likes cast during the week count. */
export function LaunchVoteButton({ applicationId, votes, signedIn, disabled, size = "md" }: {
  applicationId: string;
  votes: number;
  signedIn: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [state, setState] = useState({ voted: false, votes });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const vote = () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    const next = !state.voted;
    const previous = state;
    setState({ voted: next, votes: Math.max(0, state.votes + (next ? 1 : -1)) });
    start(async () => {
      const result = await setLikeAction(applicationId, next);
      if ("error" in result) {
        setState(previous);
        setError(true);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={vote}
      disabled={pending || disabled}
      aria-pressed={state.voted}
      title={disabled ? "Voting has closed for this week" : error ? "Could not save your vote" : "Upvote"}
      className={cx(
        "flex shrink-0 flex-col items-center justify-center rounded-xl border font-semibold tabular-nums transition disabled:cursor-default",
        size === "md" ? "h-14 w-14 text-sm" : "h-11 w-11 text-xs",
        state.voted
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background hover:border-accent hover:text-accent disabled:hover:border-border disabled:hover:text-current",
      )}
    >
      <ChevronUp className="size-4" aria-hidden="true" />
      {state.votes}
      <span className="sr-only">votes</span>
    </button>
  );
}
