"use client";

import { useEffect, useRef } from "react";

/** Counts a sponsored impression once the slot is actually visible (half on screen), via a single beacon. */
export function ImpressionBeacon({ events }: { events: { applicationId: string; placement: string }[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const payload = JSON.stringify(events);
  useEffect(() => {
    const target = ref.current?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const body = new Blob([payload], { type: "application/json" });
        if (!navigator.sendBeacon?.("/bff/sp", body)) {
          void fetch("/bff/sp", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [payload]);
  return <span ref={ref} hidden />;
}
