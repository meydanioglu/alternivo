/**
 * Data model for problem-based solution pages (/solutions/{slug}).
 *
 * topics.json  — every imported topic seed (a content candidate, never published by itself).
 * products.ts  — fact sheets: per-product attributes with a source URL and verification date each.
 * pages.ts     — editorial pages: the requirements a reader has, which products were evaluated, and the copy.
 *
 * A fact is true, false or "unknown". Unknown is never treated as support: the matching engine reports it as
 * "not verified" and such a product cannot be recommended for that requirement.
 */

export type TopicStatus = "candidate" | "researching" | "review" | "published" | "rejected";

export interface SolutionTopic {
  id: string;
  slug: string;
  title: string;
  category: string;
  primaryQuery: string;
  searchIntent: string;
  template: string;
  filters: string[];
  priority: "P1" | "P2" | "P3";
  requiresFactCheck: boolean;
  status: TopicStatus;
  notes: string;
}

export type FactValue = boolean | "unknown";

export interface Fact {
  value: FactValue;
  /** Short qualifier shown next to the value, e.g. "bank payout via Stripe Connect". */
  detail?: string;
  source?: string;
  /** ISO date the source was last checked. */
  verified?: string;
}

export interface PriceInfo {
  /** e.g. "5% + 50¢ per transaction". */
  summary: string;
  source: string;
  verified: string;
}

export interface SolutionProduct {
  id: string;
  name: string;
  website: string;
  /** Catalog slug when the product has a published Alternivo profile. */
  catalogSlug?: string;
  /** Affiliate URL, used instead of the website when set (outbound links are tagged either way). */
  affiliateUrl?: string;
  kind: string;
  facts: Record<string, Fact>;
  pricing?: PriceInfo;
  pros: string[];
  cons: string[];
  bestFor?: string;
}

export interface Requirement {
  /** Fact key that must be true. */
  fact: string;
  label: string;
  /** Hard requirements exclude a product when false; soft ones only rank it lower. */
  hard: boolean;
}

export interface SolutionFaq {
  question: string;
  answer: string;
}

export interface SolutionPage {
  slug: string;
  /** Topic id from topics.json this page answers. */
  topicId: string;
  /** H1 and title without the year. */
  title: string;
  description: string;
  intro: string;
  /** Two or three sentences answering the reader's problem directly. */
  answer: string;
  requirements: Requirement[];
  /** Facts shown as columns in the comparison table, in order. */
  columns: { fact: string; label: string }[];
  /** Every product evaluated, including the one the reader wants to replace. */
  products: string[];
  limitations: string[];
  faqs: SolutionFaq[];
  related?: string[];
  updated: string;
  /** Only "published" pages are routed, listed and indexed. */
  status: "draft" | "review" | "published";
}
