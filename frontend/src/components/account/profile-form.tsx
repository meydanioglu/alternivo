"use client";

import { useActionState } from "react";
import { type FormState, updateProfileAction } from "@/app/actions";
import { Field, FormMessage, SubmitButton, TextArea, TextInput } from "@/components/forms/form-kit";

export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="E-mail" name="email-readonly">
        <TextInput name="email-readonly" value={email} disabled readOnly />
      </Field>
      <Field label="Display name" name="displayName">
        <TextInput name="displayName" defaultValue={displayName} minLength={2} maxLength={60} required />
      </Field>
      <Field label="Bio" name="bio" optional>
        <TextArea name="bio" maxLength={500} placeholder="A few words about you" className="min-h-20" />
      </Field>
      <SubmitButton variant="outline">Save profile</SubmitButton>
    </form>
  );
}
