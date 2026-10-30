"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { decideCampaignAction } from "@/app/admin/campaigns/actions";
import { ActionForm, SubmitButton } from "@/components/forms/form-kit";

export function CampaignDecision({ id }: { id: string }) {
  const [state, action] = useActionState(decideCampaignAction, {} as FormState);
  return (
    <ActionForm action={action} state={state} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder="Not (redde zorunlu)" maxLength={1000} className="h-9 w-48 rounded-md border border-border bg-background px-2 text-sm" />
      <div className="flex gap-2">
        <button name="decision" value="reject" className="rounded-md px-3 py-1.5 text-sm text-danger hover:bg-danger/10">Reddet</button>
        <SubmitButton>Onayla</SubmitButton>
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </ActionForm>
  );
}
