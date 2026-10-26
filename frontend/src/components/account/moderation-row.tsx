"use client";

import { Check, ExternalLink, PencilLine, X } from "lucide-react";
import { useActionState } from "react";
import { type FormState, moderateSubmissionAction } from "@/app/actions";
import { FormMessage, inputClass } from "@/components/forms/form-kit";
import { buttonClass, chipClass, cx } from "@/components/ui/styles";

export interface SubmissionRow {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  categorySlug: string | null;
  pricing: string[];
  licenseSlug: string | null;
  platforms: string[];
  tags: string[];
  suggestedAlternatives: string[];
  status: string;
  possibleDuplicateApplicationId: string | null;
  createdAt: string;
}

export function ModerationRow({ row }: { row: SubmissionRow }) {
  const [state, action, pending] = useActionState(moderateSubmissionAction, {} as FormState);
  const done = !!state.ok;
  const meta = [row.categorySlug, row.licenseSlug, ...row.pricing, ...row.platforms].filter(Boolean) as string[];

  return (
    <li className={cx("rounded-[10px] border border-border bg-surface p-5", done && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{row.name}</h3>
          <a href={row.websiteUrl} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            {row.websiteUrl} <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
        {row.possibleDuplicateApplicationId && <span className={chipClass("warning", "soft", "sm")}>Possible duplicate</span>}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{row.description}</p>
      {meta.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {meta.map((m) => (
            <li key={m} className={chipClass("default", "secondary", "sm")}>
              {m}
            </li>
          ))}
        </ul>
      )}
      {row.tags.length > 0 && <p className="mt-2 text-xs text-muted">Tags: {row.tags.join(", ")}</p>}
      {row.suggestedAlternatives.length > 0 && (
        <p className="mt-1 text-xs text-muted">Alternative to: {row.suggestedAlternatives.join(", ")}</p>
      )}

      {!done && (
        <form action={action} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <input type="hidden" name="id" value={row.id} />
          <input name="note" placeholder="Note to the submitter (optional)" className={inputClass} maxLength={500} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" name="decision" value="approve" disabled={pending} className={buttonClass("primary", "sm")}>
              <Check className="size-4" aria-hidden="true" /> Approve & publish
            </button>
            <button type="submit" name="decision" value="needs-changes" disabled={pending} className={buttonClass("outline", "sm")}>
              <PencilLine className="size-4" aria-hidden="true" /> Needs changes
            </button>
            <button type="submit" name="decision" value="reject" disabled={pending} className={buttonClass("ghost", "sm", "text-danger")}>
              <X className="size-4" aria-hidden="true" /> Reject
            </button>
          </div>
        </form>
      )}
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </li>
  );
}
