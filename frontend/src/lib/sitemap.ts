import { absoluteUrl } from "@/config/site";

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlsetXml(entries: { path: string; lastModified?: string }[]) {
  const body = entries
    .map(
      (e) =>
        `<url><loc>${escapeXml(absoluteUrl(e.path))}</loc>${e.lastModified ? `<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>` : ""}</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapIndexXml(paths: string[]) {
  // No <lastmod>: we only know it per URL (inside each sitemap), and a fake "now" teaches crawlers to ignore it.
  const body = paths.map((p) => `<sitemap><loc>${escapeXml(absoluteUrl(p))}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export const xmlResponse = (xml: string) =>
  new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
