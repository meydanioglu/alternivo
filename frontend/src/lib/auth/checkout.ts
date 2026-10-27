import "server-only";
import { cookies, headers } from "next/headers";
import { userApi } from "@/lib/auth/session";

const PAY_COOKIE = "alt_pay";

/** Where the buyer pays: a PayTR iframe token, or a Lemon Squeezy hosted checkout URL. */
export type PaymentTarget = { provider: "paytr"; token: string } | { provider: "lemonsqueezy"; url: string };

/**
 * Asks the API to create an order (price and eligibility are decided server-side) and keeps the PayTR token or the
 * Lemon Squeezy checkout URL in a short-lived httpOnly cookie, so it never appears in our URLs. Returns the payment
 * page path, where the buyer first reviews the order and accepts the agreement.
 */
export async function startCheckout(plan: string, targetId: string | null): Promise<string> {
  const res = await userApi<{ orderId: string; provider?: string; token?: string; url?: string }>("/api/v1/maker/checkout", {
    method: "POST",
    body: { plan, targetId },
  });
  const target: PaymentTarget = res.provider === "lemonsqueezy" ? { provider: "lemonsqueezy", url: res.url ?? "" } : { provider: "paytr", token: res.token ?? "" };
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(PAY_COOKIE, JSON.stringify({ orderId: res.orderId, ...target }), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/maker/pay",
    maxAge: 30 * 60,
  });
  return `/maker/pay/${res.orderId}`;
}

const isLemonUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "lemonsqueezy.com" || u.hostname.endsWith(".lemonsqueezy.com"));
  } catch {
    return false;
  }
};

export async function paymentTarget(orderId: string): Promise<PaymentTarget | null> {
  try {
    const saved = JSON.parse((await cookies()).get(PAY_COOKIE)?.value ?? "null") as
      | { orderId: string; provider?: string; token?: string; url?: string }
      | null;
    if (saved?.orderId !== orderId) return null;
    if (saved.provider === "lemonsqueezy") return saved.url && isLemonUrl(saved.url) ? { provider: "lemonsqueezy", url: saved.url } : null;
    return saved.token && /^[A-Za-z0-9]+$/.test(saved.token) ? { provider: "paytr", token: saved.token } : null;
  } catch {
    return null;
  }
}
