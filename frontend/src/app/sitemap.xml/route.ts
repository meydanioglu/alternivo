import { sitemapIndexXml, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Sitemap index pointing at the per-type sitemaps. */
export function GET() {
  return xmlResponse(
    sitemapIndexXml([
      "/sitemaps/pages.xml",
      "/sitemaps/software.xml",
      "/sitemaps/alternatives.xml",
      "/sitemaps/categories.xml",
      "/sitemaps/comparisons.xml",
    ]),
  );
}
