import { apiBaseUrl, apiInternalKey } from "@/lib/api/client";

/**
 * PayTR payment notification ("Bildirim URL" in the PayTR store panel: https://alternivo.com/bff/billing/paytr).
 * Forwards the form body untouched; the API verifies the hash and answers the plain text "OK" PayTR expects.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 16 * 1024) return new Response("too large", { status: 413 });
  const response = await fetch(`${apiBaseUrl}/api/v1/billing/paytr/notify`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(apiInternalKey ? { "X-Internal-Key": apiInternalKey } : {}),
    },
    body,
    cache: "no-store",
  });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
