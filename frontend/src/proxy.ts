import { NextResponse, type NextRequest } from "next/server";
import { canonicalPair } from "@/content/keyword-targets";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Real 308 redirects for comparison URLs that are reversed or use keyword-plan names (e.g. /compare/lovable-vs-base44
 * → /compare/base44-vs-lovable). Redirecting inside a streamed page would answer 200 with a client-side redirect.
 */
export function proxy(request: NextRequest) {
  const pair = request.nextUrl.pathname.slice("/compare/".length);
  const slugs = pair.split("-vs-");
  if (slugs.length !== 2 || !slugs.every((s) => SLUG.test(s)) || slugs[0] === slugs[1]) return NextResponse.next();
  const canonical = canonicalPair(slugs[0]!, slugs[1]!);
  if (canonical === pair) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/compare/${canonical}`;
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: "/compare/:pair" };
