import { Heart, Star } from "lucide-react";
import Link from "next/link";
import type { ApplicationSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { ApplicationLogo } from "./application-logo";
import { LicenseBadge, PlatformList, PricingBadge } from "./badges";

/** Real community numbers only; nothing is shown when there is no data yet. */
export function CommunityStats({ app }: { app: Pick<ApplicationSummary, "likeCount" | "reviewCount" | "ratingAverage"> }) {
  if (app.likeCount === 0 && app.reviewCount === 0) return null;
  return (
    <span className="inline-flex items-center gap-3 text-xs text-muted">
      {app.likeCount > 0 && (
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

export function ApplicationCard({ app }: { app: ApplicationSummary }) {
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50">
      <div className="flex items-start gap-3">
        <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            <Link href={`/software/${app.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {app.name}
            </Link>
          </h3>
          {app.primaryCategory && <p className="truncate text-xs text-muted">{app.primaryCategory.name}</p>}
        </div>
        {app.isFeatured && <SponsoredLabel>Featured</SponsoredLabel>}
        <CommunityStats app={app} />
      </div>
      <p className="line-clamp-2 text-sm text-foreground/80">{app.shortDescription}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <PricingBadge pricing={app.pricing} />
        <LicenseBadge license={app.license} />
      </div>
      <PlatformList platforms={app.platforms} />
    </article>
  );
}

export function CompactApplicationRow({ app, rank }: { app: ApplicationSummary; rank?: number }) {
  return (
    <li className="relative flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-secondary">
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
