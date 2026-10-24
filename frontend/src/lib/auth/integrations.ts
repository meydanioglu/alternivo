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
  /** Plan keys with a price configured in Admin → Ayarlar (fastReview, featured, growth, …). */
  plans: string[];
  currency: string;
  testMode: boolean;
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
  currency: string;
  foundingLimit: number;
  foundingTaken: number;
  freeReviewDays: number;
  fastReviewHours: number;
}

export const googleConfig = () => getJson<GoogleConfig>("/api/v1/auth/google/config", { enabled: false, clientId: null });

export const billingConfig = () => getJson<BillingConfig>("/api/v1/billing/config", { enabled: false, plans: [], currency: "TL", testMode: false });

export const pricing = () =>
  getJson<Pricing>("/api/v1/sponsored/pricing", { plans: [], currency: "USD", foundingLimit: 100, foundingTaken: 0, freeReviewDays: 15, fastReviewHours: 24 });

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", TL: "₺", TRY: "₺" };

/** Minor units → display price, e.g. (500, "USD") → "$5", (19900, "TL") → "₺199". */
export const formatPrice = (minor: number, currency = "USD") => {
  const amount = (minor / 100).toFixed(minor % 100 === 0 ? 0 : 2);
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount}`;
};
