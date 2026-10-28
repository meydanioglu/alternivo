import "server-only";
import { cookies, headers } from "next/headers";
import { userApi } from "@/lib/auth/session";

const PAY_COOKIE = "alt_pay";

/** Where the buyer pays: the Freemius hosted checkout URL for the order's plan. */
export type PaymentTarget = { provider: "freemius"; url: string };

/**
 * Asks the API to create an order (price and eligibility are decided server-side) and keeps the Freemius checkout URL
 * in a short-lived httpOnly cookie, so it never appears in our URLs. Returns the payment page path, where the buyer
 * first reviews the order and accepts the agreement.
 */
export async function startCheckout(plan: string, targetId: string | null): Promise<string> {
  const res = await userApi<{ orderId: string; url?: string }>("/api/v1/maker/checkout", {
    method: "POST",
    body: { plan, targetId },
  });
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(PAY_COOKIE, JSON.stringify({ orderId: res.orderId, provider: "freemius", url: res.url ?? "" }), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/maker/pay",
    maxAge: 30 * 60,
  });
  return `/maker/pay/${res.orderId}`;
}

const isFreemiusUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "checkout.freemius.com";
  } catch {
    return false;
  }
};

export async function paymentTarget(orderId: string): Promise<PaymentTarget | null> {
  try {
    const saved = JSON.parse((await cookies()).get(PAY_COOKIE)?.value ?? "null") as { orderId: string; url?: string } | null;
    if (saved?.orderId !== orderId) return null;
    return saved.url && isFreemiusUrl(saved.url) ? { provider: "freemius", url: saved.url } : null;
  } catch {
    return null;
  }
}
