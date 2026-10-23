"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Sends one anonymous page view per client-side navigation (no cookies, no third parties). */
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current || pathname.startsWith("/admin")) return;
    const referrer = last.current === null ? document.referrer : `${location.origin}${last.current}`;
    last.current = pathname;
    const body = JSON.stringify({ path: pathname, referrer });
    if (!navigator.sendBeacon?.("/bff/track", new Blob([body], { type: "application/json" }))) {
      void fetch("/bff/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  }, [pathname]);

  return null;
}
