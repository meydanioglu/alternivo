"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { ActionForm, FormMessage, SubmitButton, TextArea } from "@/components/forms/form-kit";

export function InternalNoteForm({ id, note, action }: {
  id: string;
  note: string | null;
  action: (state: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  return (
    <ActionForm action={formAction} state={state} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <TextArea name="note" defaultValue={note ?? ""} rows={3} maxLength={2000} />
      <div>
        <SubmitButton variant="outline">Notu kaydet</SubmitButton>
      </div>
    </ActionForm>
  );
}
