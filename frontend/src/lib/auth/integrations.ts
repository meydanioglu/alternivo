import "server-only";
import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";

/** Public (non-secret) integration settings, managed in Admin → Ayarlar. */
async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: apiInternalKey ? { "X-Internal-Key": apiInternalKey } : {},
      next: { revalidate: 60 },
    });
    return response.ok ? ((await response.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface GoogleConfig {
  enabled: boolean;
  clientId: string | null;
}

export interface BillingConfig {
  enabled: boolean;
  productId: string | null;
  /** Plan keys that have a Freemius plan configured (fastReview, featured, growth, …). */
  plans: string[];
}

export interface PlanInfo {
  key: string;
  name: string;
  priceCents: number;
  recurring: boolean;
  durationDays: number | null;
  inventoryLimit: number | null;
}

export interface Pricing {
  plans: PlanInfo[];
  foundingLimit: number;
  foundingTaken: number;
  freeReviewDays: number;
  fastReviewHours: number;
}

export const googleConfig = () => getJson<GoogleConfig>("/api/v1/auth/google/config", { enabled: false, clientId: null });

export const billingConfig = () => getJson<BillingConfig>("/api/v1/billing/config", { enabled: false, productId: null, plans: [] });

export const pricing = () =>
  getJson<Pricing>("/api/v1/sponsored/pricing", { plans: [], foundingLimit: 100, foundingTaken: 0, freeReviewDays: 15, fastReviewHours: 24 });

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
