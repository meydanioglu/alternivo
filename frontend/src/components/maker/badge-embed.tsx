"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buttonClass, cx } from "@/components/ui/styles";

/** "Featured on Alternivo" badge with copy-paste HTML that links back to the product's listing. */
export function BadgeEmbed({ siteUrl, slug, name }: { siteUrl: string; slug: string; name: string }) {
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [copied, setCopied] = useState(false);
  const href = `${siteUrl}/software/${slug}`;
  const code = `<a href="${href}" target="_blank" rel="noopener" title="${name} on Alternivo"><img src="${siteUrl}/badge/featured-${variant}.svg" alt="${name} — Featured on Alternivo" width="220" height="54" /></a>`;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className={cx("rounded-md p-3", variant === "dark" ? "bg-[#0e0f13]" : "bg-[#f8f9fc]")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the exact asset makers will embed */}
          <img src={`/badge/featured-${variant}.svg`} alt="Featured on Alternivo" width={220} height={54} />
        </div>
        <div className="flex overflow-hidden rounded-md border border-border text-xs" role="group" aria-label="Badge style">
          {(["light", "dark"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              aria-pressed={variant === v}
              className={cx("px-3 py-1.5 capitalize", variant === v ? "bg-surface-secondary text-foreground" : "text-muted hover:text-foreground")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <label className="sr-only" htmlFor={`badge-${slug}`}>Badge HTML for {name}</label>
      <textarea
        id={`badge-${slug}`}
        readOnly
        value={code}
        rows={3}
        className="w-full resize-none rounded-md border border-border bg-background p-2 font-mono text-xs text-foreground/80"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div>
        <button type="button" onClick={copy} className={buttonClass("outline", "sm")}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
    </div>
  );
}
