import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Crawl rules. Search results and filtered/sorted listings are handled with noindex + canonical
 * (robots.txt alone cannot remove URLs from the index), so they stay crawlable here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/bff/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
