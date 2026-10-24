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
  plans: { featured: string | null; fastTrack: string | null; launchBoost: string | null };
}

export const googleConfig = () => getJson<GoogleConfig>("/api/v1/auth/google/config", { enabled: false, clientId: null });

export const billingConfig = () =>
  getJson<BillingConfig>("/api/v1/billing/config", {
    enabled: false,
    productId: null,
    plans: { featured: null, fastTrack: null, launchBoost: null },
  });

/** Freemius hosted checkout, locked to the member's e-mail so the webhook can match the purchase to the account. */
export function checkoutUrl(productId: string, planId: string, email: string, successUrl: string) {
  const params = new URLSearchParams({ user_email: email, readonly_user: "true", success_url: successUrl });
  return `https://checkout.freemius.com/product/${productId}/plan/${planId}/?${params}`;
}
