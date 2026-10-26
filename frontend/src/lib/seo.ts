import type { Metadata } from "next";
import { absoluteUrl, site } from "@/config/site";
import type { ApplicationDetail, ApplicationSummary } from "./api/types";

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /** Canonical path when different from `path` (e.g. filtered views point at the base page). */
  canonical?: string;
  noindex?: boolean;
  type?: "website" | "article";
  /** Site-relative or absolute image for social cards; defaults to the brand card. */
  image?: string | null;
}

/** Search engines show about 155-160 characters; cut longer descriptions at a word boundary. */
export function clampDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.\-–]+$/, "")}…`;
}

/** Builds complete metadata: unique title, description, canonical, Open Graph, Twitter, robots. */
export function pageMetadata({ title, description: rawDescription, path, canonical, noindex, type = "website", image }: PageMetaInput): Metadata {
  const description = clampDescription(rawDescription);
  const canonicalUrl = absoluteUrl(canonical ?? path);
  const imageUrl = image ? (image.startsWith("http") ? image : absoluteUrl(image)) : absoluteUrl("/opengraph-image.png");
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: site.name,
      type,
      locale: "en_US",
      images: [{ url: imageUrl }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const CATEGORY_TO_SCHEMA: Record<string, string> = {
  "web-browsers": "BrowserApplication",
  "video-editing": "MultimediaApplication",
  "photo-editing": "MultimediaApplication",
  "graphic-design": "DesignApplication",
  "password-managers": "SecurityApplication",
  "code-editors": "DeveloperApplication",
  databases: "DeveloperApplication",
  "ai-coding-tools": "DeveloperApplication",
  communication: "CommunicationApplication",
  "project-management": "BusinessApplication",
  crm: "BusinessApplication",
  analytics: "BusinessApplication",
};

const OS_NAMES: Record<string, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS",
  ipados: "iPadOS",
  web: "Web browser",
};

/**
 * SoftwareApplication structured data. AggregateRating is only emitted when real,
 * visible reviews exist — it is never fabricated.
 */
export function softwareJsonLd(app: ApplicationDetail) {
  const s = app.summary;
  const os = s.platforms.map((p) => OS_NAMES[p.slug]).filter(Boolean);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: s.name,
    description: s.shortDescription,
    url: absoluteUrl(`/software/${s.slug}`),
    applicationCategory: CATEGORY_TO_SCHEMA[s.primaryCategory?.slug ?? ""] ?? "UtilitiesApplication",
    ...(os.length > 0 && { operatingSystem: os.join(", ") }),
    ...(app.websiteUrl && { sameAs: [app.websiteUrl] }),
    ...((app.screenshots[0]?.url ?? s.logoUrl) && { image: absoluteUrl((app.screenshots[0]?.url ?? s.logoUrl)!) }),
    ...(s.logoUrl?.startsWith("/") && { thumbnailUrl: absoluteUrl(s.logoUrl) }),
    ...(app.developer && { author: { "@type": "Organization", name: app.developer } }),
    ...(s.license?.isOpenSource && { license: s.license.name }),
  };

  if (s.pricing.includes("free") && !s.pricing.includes("paid")) {
    data.offers = { "@type": "Offer", price: "0", priceCurrency: "USD" };
  }

  if (s.reviewCount > 0 && s.ratingAverage !== null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: s.ratingAverage,
      reviewCount: s.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function itemListJsonLd(name: string, apps: ApplicationSummary[], offset = 0) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: apps.length,
    itemListElement: apps.map((a, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      url: absoluteUrl(`/software/${a.slug}`),
      name: a.name,
    })),
  };
}

/** Our own identity for search engines and answer engines: who Alternivo is and what it does. */
export const organizationJsonLd = () => ({
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  logo: { "@type": "ImageObject", url: absoluteUrl("/brand/app-icon-512.png"), width: 512, height: 512 },
  image: absoluteUrl("/opengraph-image.png"),
  description:
    "Alternivo is a software discovery platform for finding alternatives to apps and AI tools and comparing them by features, pricing, platforms and license. Makers can submit software and AI tools for free.",
  slogan: site.tagline,
  knowsAbout: ["Software alternatives", "AI tools", "Software comparison", "SaaS", "Open-source software", "AI tool directory"],
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      description: site.description,
      inLanguage: "en",
      publisher: { "@id": `${site.url}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    organizationJsonLd(),
  ],
});
