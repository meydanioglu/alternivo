import { Heart, Star } from "lucide-react";
import Link from "next/link";
import type { ApplicationSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { ApplicationLogo } from "./application-logo";
import { pricingSummary } from "./software-row";
import { LicenseBadge, PlatformList, PricingBadge } from "./badges";

/** Below this, a like count says more about how new the site is than about the product, so it is not shown. */
const MIN_VISIBLE_LIKES = 5;

/** Real community numbers only; nothing is shown when there is not enough data to mean anything. */
export function CommunityStats({ app }: { app: Pick<ApplicationSummary, "likeCount" | "reviewCount" | "ratingAverage"> }) {
  const showLikes = app.likeCount >= MIN_VISIBLE_LIKES;
  if (!showLikes && app.reviewCount === 0) return null;
  return (
    <span className="inline-flex items-center gap-3 text-xs text-muted">
      {showLikes && (
        <span className="inline-flex items-center gap-1" title="Community likes">
          <Heart className="size-3.5" aria-hidden="true" />
          {formatNumber(app.likeCount)}
          <span className="sr-only">likes</span>
        </span>
      )}
      {app.reviewCount > 0 && app.ratingAverage !== null && (
        <span className="inline-flex items-center gap-1" title={`${app.reviewCount} reviews`}>
          <Star className="size-3.5" aria-hidden="true" />
          {app.ratingAverage.toFixed(1)}
          <span className="sr-only">average rating from {app.reviewCount} reviews</span>
        </span>
      )}
    </span>
  );
}

/** Disclosure label for paid placements. */
export function SponsoredLabel({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent" title="Paid placement">
      {children}
    </span>
  );
}

/** Grid card for visual browsing: identity, one line of context, and a single metadata line. */
export function ApplicationCard({ app }: { app: ApplicationSummary }) {
  const meta = [pricingSummary(app), app.platforms.length > 0 ? platformSummary(app.platforms) : null].filter(Boolean);
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-[10px] border border-border bg-surface p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-start gap-3">
        <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link href={`/software/${app.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {app.name}
            </Link>
          </h3>
          {app.primaryCategory && <p className="truncate text-xs text-muted">{app.primaryCategory.name}</p>}
        </div>
        {app.isFeatured && <SponsoredLabel>Featured</SponsoredLabel>}
      </div>
      <p className="line-clamp-2 text-sm text-foreground/75">{app.shortDescription}</p>
      {meta.length > 0 && <p className="mt-auto truncate text-xs text-muted">{meta.join(" · ")}</p>}
    </article>
  );
}

/** "Windows, macOS, Linux" or "Web + 4 more" — short enough for one line. */
export function platformSummary(platforms: ApplicationSummary["platforms"], max = 3) {
  const names = platforms.map((p) => p.name);
  return names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export function CompactApplicationRow({ app, rank }: { app: ApplicationSummary; rank?: number }) {
  return (
    <li className="relative flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-secondary/60">
      {rank !== undefined && <span className="w-5 text-right text-sm tabular-nums text-muted">{rank}</span>}
      <ApplicationLogo name={app.name} logoUrl={app.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <Link href={`/software/${app.slug}`} className="block truncate text-sm font-medium after:absolute after:inset-0">
          {app.name}
        </Link>
        <p className="truncate text-xs text-muted">{app.shortDescription}</p>
      </div>
      <PricingBadge pricing={app.pricing} />
    </li>
  );
}

export function ApplicationGrid({ apps }: { apps: ApplicationSummary[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {apps.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}
