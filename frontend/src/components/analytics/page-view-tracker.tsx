"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Sends one anonymous page view per client-side navigation (no cookies, no third parties). */
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current || pathname.startsWith("/admin")) return;
    const landing = last.current === null;
    const referrer = landing ? document.referrer : `${location.origin}${last.current}`;
    last.current = pathname;
    // The landing view keeps its utm_* parameters for campaign attribution; everything else in the query is dropped.
    const utm = landing ? new URLSearchParams([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith("utm_"))).toString() : "";
    const body = JSON.stringify({ path: (utm ? `${pathname}?${utm}` : pathname).slice(0, 300), referrer });
    if (!navigator.sendBeacon?.("/bff/track", new Blob([body], { type: "application/json" }))) {
      void fetch("/bff/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  }, [pathname]);

  return null;
}
