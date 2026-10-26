import Link from "next/link";
import type { ApplicationSummary } from "@/lib/api/types";
import { pricingLabel } from "@/lib/format";
import { ApplicationLogo } from "./application-logo";

/** Plain-language pricing summary: the most useful single word for a list (Free / Freemium / Paid / Open source). */
export function pricingSummary(app: Pick<ApplicationSummary, "pricing" | "isOpenSource">) {
  if (app.isOpenSource) return "Open source";
  const p = app.pricing;
  if (p.includes("free")) return "Free";
  if (p.includes("freemium")) return "Free plan";
  if (p.length > 0) return pricingLabel(p[0]!);
  return null;
}

/**
 * Dense list row for discovery lists: logo, name, category, one-line description and pricing. Used where scanning
 * many products matters more than visual browsing (recently added, related software, search results).
 */
export function SoftwareListRow({ app, href, trailing }: { app: ApplicationSummary; href?: string; trailing?: React.ReactNode }) {
  const price = pricingSummary(app);
  return (
    <li className="group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-secondary/60">
      <ApplicationLogo name={app.name} logoUrl={app.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <Link href={href ?? `/software/${app.slug}`} className="truncate font-medium after:absolute after:inset-0 focus-visible:outline-none">
            {app.name}
          </Link>
          {app.primaryCategory && <span className="hidden truncate text-xs text-muted sm:inline">{app.primaryCategory.name}</span>}
        </p>
        <p className="truncate text-sm text-muted">{app.shortDescription}</p>
      </div>
      <span className="hidden w-40 shrink-0 text-right text-xs text-muted md:block">
        {price}
        {app.platforms.length > 0 && <span className="block truncate">{app.platforms.slice(0, 3).map((p) => p.name).join(", ")}{app.platforms.length > 3 ? ` +${app.platforms.length - 3}` : ""}</span>}
      </span>
      {price && <span className="shrink-0 text-xs text-muted md:hidden">{price}</span>}
      {trailing}
    </li>
  );
}

export function SoftwareList({ apps, className }: { apps: ApplicationSummary[]; className?: string }) {
  if (apps.length === 0) return null;
  return (
    <ul className={`divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface ${className ?? ""}`}>
      {apps.map((a) => (
        <SoftwareListRow key={a.id} app={a} />
      ))}
    </ul>
  );
}
