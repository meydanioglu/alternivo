import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";

/**
 * Freemius webhook endpoint (configure https://alternivo.com/bff/billing/freemius in the Freemius dashboard).
 * Forwards the raw body and x-signature untouched; the API verifies the signature with the product secret key.
 */
export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  if (body.byteLength > 512 * 1024) return new Response(null, { status: 413 });
  const response = await fetch(`${apiBaseUrl}/api/v1/billing/freemius/webhook`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      "x-signature": request.headers.get("x-signature") ?? "",
      ...(apiInternalKey ? { "X-Internal-Key": apiInternalKey } : {}),
    },
    body,
    cache: "no-store",
  });
  return new Response(null, { status: response.status });
}
