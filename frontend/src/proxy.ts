import { NextResponse, type NextRequest } from "next/server";
import { canonicalPair } from "@/content/keyword-targets";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Real 308 redirects for URL normalisation, so duplicates never answer 200:
 * - slugs are lowercase (/software/Notion → /software/notion);
 * - comparison pairs use one canonical order and catalog slugs (/compare/lovable-vs-base44 → /compare/base44-vs-lovable).
 * Redirecting inside a streamed page would answer 200 with a client-side redirect instead.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  if (!pathname.startsWith("/compare/")) return NextResponse.next();
  const pair = pathname.slice("/compare/".length);
  const slugs = pair.split("-vs-");
  if (slugs.length !== 2 || !slugs.every((s) => SLUG.test(s)) || slugs[0] === slugs[1]) return NextResponse.next();
  const canonical = canonicalPair(slugs[0]!, slugs[1]!);
  if (canonical === pair) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/compare/${canonical}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/software/:path*", "/category/:path*", "/compare/:path*", "/best/:path*", "/guides/:path*", "/alternatives/:path*"],
};
