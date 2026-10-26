"use client";

import { Check, Code2, Copy, Share2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { sharePostAction, verifyBadgeAction } from "@/app/maker/actions";
import { FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";
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
 * Optional "share Alternivo" step for a free submission: add our badge to your homepage or post about us,
 * and the review time drops from 15 to 7 days. The free listing never depends on it.
 */
export function ShareBoost({ submissionId, productName, siteUrl }: { submissionId: string; productName: string; siteUrl: string }) {
  const [mode, setMode] = useState<"badge" | "post">("badge");
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [badgeState, badgeAction] = useActionState(verifyBadgeAction, {} as FormState);
  const [postState, postAction] = useActionState(sharePostAction, {} as FormState);
  const code = `<a href="${siteUrl}/?utm_source=badge" target="_blank" rel="noopener" title="Find software alternatives on Alternivo"><img src="${siteUrl}/badge/featured-${variant}.svg" alt="Featured on Alternivo" width="220" height="54" /></a>`;
  const caption = `Just submitted ${productName} to Alternivo, a directory for finding and comparing software alternatives: ${siteUrl}`;

  const option = (key: "badge" | "post", Icon: typeof Code2, title: string, text: string) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      aria-pressed={mode === key}
      className={cx("flex flex-1 items-start gap-3 rounded-[10px] border p-3 text-left", mode === key ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30")}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </button>
  );

  return (
    <div className="rounded-[10px] border border-border bg-background p-4">
      <p className="font-medium">Get reviewed in 7 days instead of 15, for free</p>
      <p className="mt-0.5 text-xs text-muted">Optional. Pick one: add our badge to your homepage, or post that {productName} is on Alternivo.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {option("badge", Code2, "Badge on my site", "Embed a small badge on your homepage")}
        {option("post", Share2, "Post about us", "Share a link on X or Substack")}
      </div>

      {mode === "badge" ? (
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
      ) : (
        <form action={postAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="submissionId" value={submissionId} />
          <p className="text-xs text-muted">Post from a real, public account. We check the post during review.</p>
          <div className="rounded-md border border-border bg-surface p-3 text-sm">
            <p className="text-xs text-muted">Suggested caption</p>
            <p className="mt-1">{caption}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={caption} label="Copy caption" />
            <a className={buttonClass("outline", "sm")} target="_blank" rel="noopener" href={`https://x.com/intent/post?text=${encodeURIComponent(caption)}`}>
              Post on X
            </a>
            <a className={buttonClass("outline", "sm")} target="_blank" rel="noopener" href="https://substack.com/notes">
              Post a Substack note
            </a>
          </div>
          <label htmlFor={`share-url-${submissionId}`} className="text-xs text-muted">Link to your post</label>
          <TextInput id={`share-url-${submissionId}`} name="url" type="url" required placeholder="https://x.com/you/status/..." />
          <FormMessage state={postState} />
          <div>
            <SubmitButton>I posted it</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
