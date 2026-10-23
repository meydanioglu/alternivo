import { api } from "@/lib/api/client";
import { urlsetXml, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

const API_TYPES = new Set(["software", "alternatives", "categories", "comparisons"]);
const STATIC_PAGES = ["/", "/ais", "/software", "/categories", "/compare", "/launches", "/launches/archive", "/leaderboard", "/new-apps", "/trending", "/submit"];

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

  if (!API_TYPES.has(type) || !name.endsWith(".xml")) {
    return new Response("Not found", { status: 404 });
  }

  const entries = await api.sitemap(type);
  return xmlResponse(urlsetXml(entries));
}
