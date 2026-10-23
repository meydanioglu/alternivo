"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type FormState, loginAction, registerAction } from "@/app/actions";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

const initial: FormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="E-mail" name="email">
        <TextInput name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" name="password">
        <TextInput name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, initial);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Display name" name="displayName" error={errors.displayName} hint="Shown on your reviews and submissions.">
        <TextInput name="displayName" autoComplete="nickname" required minLength={2} maxLength={60} error={errors.displayName} />
      </Field>
      <Field label="E-mail" name="email" error={errors.email}>
        <TextInput name="email" type="email" autoComplete="email" required error={errors.email} />
      </Field>
      <Field
        label="Password"
        name="password"
        error={errors.password}
        hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number."
      >
        <TextInput name="password" type="password" autoComplete="new-password" required minLength={10} error={errors.password} />
      </Field>
      <SubmitButton className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
