import type { ApplicationSummary, PricingName } from "./api/types";

const PRICING_LABELS: Record<PricingName, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  "free-trial": "Free trial",
  "one-time-purchase": "One-time purchase",
  subscription: "Subscription",
};

export const pricingLabel = (p: PricingName) => PRICING_LABELS[p] ?? p;

/** Short, honest pricing headline: "Free", "Free plan available", or "Paid". */
export function pricingHeadline(pricing: PricingName[]): string {
  if (pricing.includes("free") && !pricing.some((p) => p === "paid" || p === "subscription")) return "Free";
  if (pricing.includes("free") || pricing.includes("freemium")) return "Free plan available";
  if (pricing.includes("one-time-purchase")) return "One-time purchase";
  if (pricing.length === 0) return "Pricing unknown";
  return "Paid";
}

export const hasFreeOption = (a: Pick<ApplicationSummary, "pricing">) =>
  a.pricing.includes("free") || a.pricing.includes("freemium");

const dateFormatter = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });
export const formatDate = (iso: string | null | undefined) => (iso ? dateFormatter.format(new Date(iso)) : null);

export const formatNumber = (n: number) => new Intl.NumberFormat("en").format(n);

export const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export const SIGNAL_LABELS: Record<string, string> = {
  votes: "Community votes",
  featureOverlap: "Feature overlap",
  platformCompatibility: "Platform compatibility",
  categoryRelevance: "Category relevance",
  rating: "Review rating",
  ratingDefault: "Review rating (no reviews yet: neutral default)",
  freshness: "Data freshness",
  editorial: "Editorial score",
};

export const currentYear = () => new Date().getFullYear();
