"use client";

import { MailWarning } from "lucide-react";
import { useActionState } from "react";
import { type FormState, resendConfirmationAction } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-kit";

const initial: FormState = {};

/** Shown to signed-in users who have not confirmed their e-mail yet; posting content stays blocked until they do. */
export function ConfirmEmailNotice({ email }: { email: string }) {
  const [state, action] = useActionState(resendConfirmationAction, initial);
  return (
    <section className="rounded-[10px] border border-warning/40 bg-warning/10 p-4 text-sm">
      <div className="flex gap-3">
        <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Confirm your e-mail address</h2>
          <p className="mt-1 text-foreground/80">
            Before you can submit products, write reviews or suggest alternatives, confirm <strong className="break-all">{email}</strong> using
            the link we sent you.
          </p>
          <form action={action} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="email" value={email} />
            <FormMessage state={state} />
            <SubmitButton variant="outline" className="self-start">
              Send a new link
            </SubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
