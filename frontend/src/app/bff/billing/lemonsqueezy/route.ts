import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";

/**
 * Lemon Squeezy webhook (Settings → Webhooks in Lemon Squeezy: https://alternivo.com/bff/billing/lemonsqueezy).
 * Forwards the raw body and its X-Signature header untouched; the API verifies the signature.
 */
export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  if (body.byteLength > 256 * 1024) return new Response("too large", { status: 413 });
  const response = await fetch(`${apiBaseUrl}/api/v1/billing/lemonsqueezy/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Signature": request.headers.get("x-signature") ?? "",
      ...(apiInternalKey ? { "X-Internal-Key": apiInternalKey } : {}),
    },
    body,
    cache: "no-store",
  });
  return new Response(null, { status: response.status });
}
