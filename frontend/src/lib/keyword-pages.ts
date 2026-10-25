import "server-only";
import { type BestPage, MIN_BEST_ITEMS } from "@/content/best-pages";
import { api } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/api/types";

export interface ListedApp {
  summary: ApplicationSummary;
  indexable: boolean;
  categories: string[];
}

/** Loads the published catalog entries for a list of slugs, in order; missing or unpublished ones are skipped. */
export async function loadApps(slugs: string[]): Promise<ListedApp[]> {
  const unique = [...new Set(slugs)];
  const rows = await Promise.all(
    unique.map((slug) =>
      api.application(slug).then(
        (d) => ({ summary: d.summary, indexable: d.indexable !== false, categories: d.categories.map((c) => c.name) }),
        () => null,
      ),
    ),
  );
  return rows.filter((r): r is ListedApp => r !== null);
}

/** A best page is indexable when it lists enough products whose own pages are indexable (no thin pages). */
export function bestIndexable(apps: ListedApp[]) {
  return apps.filter((a) => a.indexable).length >= MIN_BEST_ITEMS;
}

export async function loadBest(page: BestPage) {
  const apps = await loadApps(page.apps);
  return { apps, indexable: bestIndexable(apps) };
}
