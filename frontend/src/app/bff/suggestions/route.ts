import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl } from "@/lib/api/client";

/**
 * Thin proxy for browser autocomplete. It adds no business logic: it forwards the query and the
 * end-user IP (so the API can rate-limit per visitor) to the internal API, which is not public.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  // The edge proxy (Caddy) appends the real client IP last; earlier entries are client-controlled.
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? request.headers.get("x-real-ip") ?? "";
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/search/suggestions?q=${encodeURIComponent(q)}`, {
      headers: { accept: "application/json", ...(forwardedFor && { "X-Forwarded-For": forwardedFor }) },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 429) {
      return NextResponse.json([], { status: 429 });
    }
    if (!res.ok) {
      return NextResponse.json([], { status: 502 });
    }
    return NextResponse.json(await res.json(), { headers: { "Cache-Control": "private, max-age=30" } });
  } catch {
    return NextResponse.json([], { status: 504 });
  }
}
