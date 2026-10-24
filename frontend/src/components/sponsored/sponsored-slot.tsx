import { ApplicationLogo } from "@/components/catalog/application-logo";
import { SponsoredLabel } from "@/components/catalog/application-card";
import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/api/types";
import { ImpressionBeacon } from "./impression-beacon";

interface SponsoredItem {
  application: ApplicationSummary;
  placement: string;
  label: string;
}

async function load(slot: string): Promise<SponsoredItem[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/sponsored?slot=${encodeURIComponent(slot)}`, {
      headers: apiInternalKey ? { "X-Internal-Key": apiInternalKey } : {},
      next: { revalidate: 120, tags: ["sponsored"] },
    });
    return response.ok ? ((await response.json()) as SponsoredItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Paid placements, rendered beside organic results and always labelled. Links go through /go (noindex, rel="sponsored")
 * so clicks can be counted; nothing renders (and nothing is fetched client-side) when the slot is empty.
 */
export async function SponsoredSlot({ slot, title = "Sponsored", className }: { slot: string; title?: string; className?: string }) {
  const items = await load(slot);
  if (items.length === 0) return null;
  return (
    <aside aria-label={title} className={className}>
      <ImpressionBeacon events={items.map((i) => ({ applicationId: i.application.id, placement: i.placement }))} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.application.id} className="relative flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <ApplicationLogo name={i.application.name} logoUrl={i.application.logoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <a
                  href={`/go/${i.application.id}?p=${i.placement}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="truncate font-semibold after:absolute after:inset-0 hover:underline"
                >
                  {i.application.name}
                </a>
                <SponsoredLabel>{i.label}</SponsoredLabel>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{i.application.shortDescription}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
