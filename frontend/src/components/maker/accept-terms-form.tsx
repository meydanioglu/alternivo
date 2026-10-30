"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { acceptTermsAction } from "@/app/maker/actions";
import { ActionForm, SubmitButton } from "@/components/forms/form-kit";

/** Required acknowledgements before the Freemius checkout opens. Both are recorded with the order server-side. */
export function AcceptTermsForm({ orderId, amount }: { orderId: string; amount: string }) {
  const [state, action] = useActionState(acceptTermsAction, {} as FormState);
  const box = "mt-0.5 size-4 shrink-0 accent-[var(--accent)]";
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="flex gap-3 text-sm leading-relaxed">
        <input type="checkbox" name="agreement" required className={box} />
        <span>
          I have read and accept the{" "}
          <Link href="/distance-sales-agreement#pre-contract" target="_blank" className="text-accent underline">pre-contract information</Link> and the{" "}
          <Link href="/distance-sales-agreement#agreement" target="_blank" className="text-accent underline">distance sales agreement</Link>, and I have read the{" "}
          <Link href="/refund-policy" target="_blank" className="text-accent underline">refund policy</Link>.
        </span>
      </label>
      <label className="flex gap-3 text-sm leading-relaxed">
        <input type="checkbox" name="immediate" required className={box} />
        <span>
          I ask for the service to start immediately after payment, and I understand that once it has started with my approval, the statutory
          right of withdrawal no longer applies. Refunds under the refund policy remain available.
        </span>
      </label>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <SubmitButton>Confirm and continue to payment ({amount})</SubmitButton>
      </div>
    </ActionForm>
  );
}
