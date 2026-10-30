"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { assignEntitlementAction } from "@/app/maker/actions";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms/form-kit";

/** Applies a purchased boost to one of the member's products (or, for fast track, a pending submission). */
export function AssignForm({ entitlementId, targets, currentId }: {
  entitlementId: string;
  targets: { id: string; name: string }[];
  currentId: string | null;
}) {
  const [state, action] = useActionState(assignEntitlementAction, {} as FormState);
  if (targets.length === 0) return <p className="text-xs text-muted">No eligible product yet.</p>;
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-2">
      <input type="hidden" name="entitlementId" value={entitlementId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`t-${entitlementId}`}>Product</label>
        <select
          id={`t-${entitlementId}`}
          name="targetId"
          defaultValue={currentId ?? ""}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="" disabled>Choose…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <SubmitButton variant="outline">Apply</SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}
