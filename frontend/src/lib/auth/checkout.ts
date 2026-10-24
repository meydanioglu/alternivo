import "server-only";
import { cookies, headers } from "next/headers";
import { userApi } from "@/lib/auth/session";

const PAY_COOKIE = "alt_pay";

/**
 * Asks the API to create a PayTR order (price and eligibility are decided server-side) and keeps the iframe token
 * in a short-lived httpOnly cookie, so it never appears in a URL. Returns the payment page path.
 */
export async function startCheckout(plan: string, targetId: string | null): Promise<string> {
  const { orderId, token } = await userApi<{ orderId: string; token: string }>("/api/v1/maker/checkout", {
    method: "POST",
    body: { plan, targetId },
  });
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(PAY_COOKIE, JSON.stringify({ orderId, token }), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/maker/pay",
    maxAge: 30 * 60,
  });
  return `/maker/pay/${orderId}`;
}

export async function paymentToken(orderId: string): Promise<string | null> {
  try {
    const saved = JSON.parse((await cookies()).get(PAY_COOKIE)?.value ?? "null") as { orderId: string; token: string } | null;
    return saved?.orderId === orderId && /^[A-Za-z0-9]+$/.test(saved.token) ? saved.token : null;
  } catch {
    return null;
  }
}
