import { BEST_PAGES } from "@/content/best-pages";
import { GUIDES } from "@/content/guides";
import { COMPARE_TARGETS, canonicalPair } from "@/content/keyword-targets";
import { api } from "@/lib/api/client";
import { loadBest } from "@/lib/keyword-pages";
import { urlsetXml, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

const API_TYPES = new Set(["software", "alternatives", "categories", "comparisons"]);
/**
 * Keyword-plan pages: guides, best lists that have enough indexable products, and the keyword comparison
 * pairs whose page is indexable (comparisons the API sitemap already lists are not repeated).
 */
async function keywordEntries() {
  const entries: { path: string; lastModified?: string }[] = [{ path: "/best" }, { path: "/guides" }];
  for (const g of GUIDES) entries.push({ path: `/guides/${g.slug}`, lastModified: g.updated });
  // Sequential on purpose: each list loads several products, and fanning out 80 lists at once floods the API.
  for (const p of BEST_PAGES) if ((await loadBest(p)).indexable) entries.push({ path: `/best/${p.slug}` });

  const listed = new Set((await api.sitemap("comparisons").catch(() => [])).map((e) => e.path));
  const pairs = [...new Set(COMPARE_TARGETS.map(([a, b]) => canonicalPair(a, b)))];
  for (const pair of pairs) {
    const path = `/compare/${pair}`;
    if (listed.has(path)) continue;
    if (await api.compare(pair).then((c) => c.isIndexable, () => false)) entries.push({ path });
  }
  return entries;
}

const STATIC_PAGES = ["/", "/ais", "/software", "/categories", "/compare", "/launches", "/launches/archive", "/leaderboard", "/new-apps", "/trending", "/submit", "/help", "/terms", "/privacy", "/pricing"];

/**
 * /sitemaps/{type}.xml. The API only returns canonical, indexable URLs (published apps,
 * alternatives pages above the thin-content threshold, categories with apps, canonical comparison pairs).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const type = name.replace(/\.xml$/, "");

  if (type === "pages") {
    return xmlResponse(urlsetXml(STATIC_PAGES.map((path) => ({ path }))));
  }

  if (name === "keywords.xml") {
    return xmlResponse(urlsetXml(await keywordEntries()));
  }

  if (!API_TYPES.has(type) || !name.endsWith(".xml")) {
    return new Response("Not found", { status: 404 });
  }

  const entries = await api.sitemap(type);
  return xmlResponse(urlsetXml(entries));
}
