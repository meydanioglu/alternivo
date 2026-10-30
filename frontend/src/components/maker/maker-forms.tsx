"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { checkoutAction, createCampaignAction } from "@/app/maker/actions";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

/** A single "Pay" button: the server validates the purchase, then opens the Freemius payment page. */
export function CheckoutButton({ plan, targetId, label, variant = "outline" }: {
  plan: string;
  targetId?: string;
  label: string;
  variant?: "primary" | "outline";
}) {
  const [state, action] = useActionState(checkoutAction, {} as FormState);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-1">
      <input type="hidden" name="plan" value={plan} />
      {targetId && <input type="hidden" name="targetId" value={targetId} />}
      <SubmitButton variant={variant}>{label}</SubmitButton>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </ActionForm>
  );
}

const select = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

export function CampaignForm({ products, categories, plans }: {
  products: { id: string; name: string }[];
  categories: { slug: string; name: string }[];
  plans: { key: string; label: string }[];
}) {
  const [state, action] = useActionState(createCampaignAction, {} as FormState);
  const [plan, setPlan] = useState(plans[0]?.key ?? "");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" name="applicationId">
          <select id="applicationId" name="applicationId" className={select} required defaultValue="">
            <option value="" disabled>Choose…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Placement" name="plan">
          <select id="plan" name="plan" className={select} value={plan} onChange={(e) => setPlan(e.target.value)}>
            {plans.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Field>
        {plan === "categorySponsorship" && (
          <Field label="Category" name="category">
            <select id="category" name="category" className={select} required defaultValue="">
              <option value="" disabled>Choose…</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {(plan === "competitorSponsorship" || plan === "alternativeCard") && (
          <Field label="Competitor" name="competitor" hint="The product whose alternatives page you want to appear on, as in its URL (e.g. notion).">
            <TextInput name="competitor" required maxLength={120} placeholder="notion" />
          </Field>
        )}
        <Field label="Start date" name="startsAt" optional hint="Starts after payment and approval if left empty.">
          <TextInput name="startsAt" type="date" min={today} />
        </Field>
      </div>
      <p className="text-xs text-muted">
        We hold the spot for 30 minutes while you pay. Campaigns go live after a quick review; if one is rejected you get a full refund.
      </p>
      <div>
        <SubmitButton>Reserve and pay</SubmitButton>
      </div>
    </ActionForm>
  );
}
