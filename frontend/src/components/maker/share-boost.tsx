"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { verifyBadgeAction } from "@/app/maker/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-kit";
import { buttonClass, cx } from "@/components/ui/styles";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("outline", "sm")}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/**
 * Required step for a free submission: the Alternivo badge on the product's homepage. A free listing is approved only
 * once the badge is verified, and verifying it also shortens the review from 15 to 7 days. Fast Review skips this step.
 */
export function ShareBoost({ submissionId, siteUrl }: { submissionId: string; siteUrl: string }) {
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [badgeState, badgeAction] = useActionState(verifyBadgeAction, {} as FormState);
  const code = `<a href="${siteUrl}/?utm_source=badge" target="_blank" rel="noopener" title="Find software alternatives on Alternivo"><img src="${siteUrl}/badge/featured-${variant}.svg" alt="Featured on Alternivo" width="220" height="54" /></a>`;

  return (
    <div className="rounded-[10px] border border-warning/40 bg-background p-4">
      <p className="font-medium">Add the Alternivo badge to publish your free listing</p>
      <p className="mt-0.5 text-xs text-muted">
        Free listings are approved only after our badge is live on your homepage. Once verified, your review time drops from 15 to 7 days.
        Prefer not to? Fast Review does not need the badge.
      </p>
      <form action={badgeAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="submissionId" value={submissionId} />
        <div className="flex flex-wrap items-center gap-3">
          <div className={cx("rounded-md p-3", variant === "dark" ? "bg-[#0e0f13]" : "bg-[#f8f9fc]")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the exact asset makers embed */}
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
        <label htmlFor={`share-code-${submissionId}`} className="text-xs text-muted">Embed code: paste it into your homepage HTML</label>
        <textarea
          id={`share-code-${submissionId}`}
          readOnly
          value={code}
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-md border border-border bg-surface p-2 font-mono text-xs text-foreground/80"
        />
        <FormMessage state={badgeState} />
        <div className="flex flex-wrap gap-2">
          <CopyButton text={code} label="Copy code" />
          <SubmitButton>Verify badge</SubmitButton>
        </div>
      </form>
    </div>
  );
}
