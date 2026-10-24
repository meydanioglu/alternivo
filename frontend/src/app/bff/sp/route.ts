import { headers } from "next/headers";
import { apiBaseUrl } from "@/lib/api/client";

/** Sponsored impression beacon. Forwards the client IP (not the internal key) so the API can de-duplicate and rate-limit per visitor. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4000) return new Response(null, { status: 413 });
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  try {
    await fetch(`${apiBaseUrl}/api/v1/sponsored/impressions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(forwarded ? { "X-Forwarded-For": forwarded } : {}),
        "user-agent": h.get("user-agent") ?? "",
      },
      body: text,
      cache: "no-store",
    });
  } catch {
    // Analytics must never break the page.
  }
  return new Response(null, { status: 204 });
}
