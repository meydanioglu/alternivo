import { Star } from "lucide-react";
import Link from "next/link";
import type { Review } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { cx } from "@/components/ui/styles";

export function Stars({ value, label }: { value: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cx("size-4", i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </span>
  );
}

export function RatingSummary({ average, count }: { average: number | null; count: number }) {
  if (count === 0 || average === null) {
    return <p className="text-sm text-muted">No reviews yet.</p>;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl font-semibold tabular-nums">{average.toFixed(1)}</span>
      <div>
        <Stars value={average} />
        <p className="text-xs text-muted">
          Based on {count} {count === 1 ? "review" : "reviews"}
        </p>
      </div>
    </div>
  );
}

export function ReviewCard({ review, showApplication = false }: { review: Review; showApplication?: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars value={review.rating} label={`${review.rating} out of 5 stars`} />
          <h3 className="text-sm font-semibold">{review.title}</h3>
        </div>
        <p className="text-xs text-muted">
          {review.authorName} · <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
        </p>
      </header>
      {showApplication && review.application && (
        <p className="mt-1 text-xs text-muted">
          on{" "}
          <Link className="underline" href={`/software/${review.application.slug}`}>
            {review.application.name}
          </Link>
        </p>
      )}
      <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">{review.body}</p>
      {(review.pros || review.cons) && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {review.pros && (
            <div>
              <dt className="font-medium text-success">Pros</dt>
              <dd className="whitespace-pre-line text-foreground/80">{review.pros}</dd>
            </div>
          )}
          {review.cons && (
            <div>
              <dt className="font-medium text-danger">Cons</dt>
              <dd className="whitespace-pre-line text-foreground/80">{review.cons}</dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}
