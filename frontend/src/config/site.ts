/**
 * Brand configuration. Rename the product by changing these environment variables —
 * no code changes required.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Alternivo",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://alternivo.com").replace(/\/$/, ""),
  tagline: "Find software that fits you better.",
  description:
    "Discover, compare and choose software, apps and AI tools. Browse curated alternatives with transparent ranking, real pricing and platform details.",
} as const;

export const absoluteUrl = (path: string) => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
