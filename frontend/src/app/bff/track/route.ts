import { cookies } from "next/headers";
import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";

/** Page-view beacon. Forwards to the API with the visitor's IP and user agent; never fails the page. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string; referrer?: string };
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": request.headers.get("user-agent") ?? "",
    };
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) headers["X-Forwarded-For"] = forwarded;
    if (apiInternalKey) headers["X-Internal-Key"] = apiInternalKey;
    const token = (await cookies()).get("alt_at")?.value;
    if (token) headers.authorization = `Bearer ${token}`;

    await fetch(`${apiBaseUrl}/api/v1/analytics/pageview`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: String(body.path ?? "").slice(0, 300), referrer: body.referrer ? String(body.referrer).slice(0, 500) : null }),
      cache: "no-store",
    });
  } catch {
    // Analytics must never break anything.
  }
  return new Response(null, { status: 204 });
}
