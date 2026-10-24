"use client";

import { useActionState } from "react";
import { type FormState, submitProductAction } from "@/app/actions";
import { CheckboxGroup, Field, FormMessage, Select, SubmitButton, TextArea, TextInput } from "@/components/forms/form-kit";

const PRICING = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "free-trial", label: "Free trial" },
  { value: "paid", label: "Paid" },
  { value: "subscription", label: "Subscription" },
  { value: "one-time-purchase", label: "One-time purchase" },
];

const LICENSES = [
  { value: "proprietary", label: "Proprietary" },
  { value: "mit", label: "MIT" },
  { value: "apache-2-0", label: "Apache 2.0" },
  { value: "gpl-3-0", label: "GPL 3.0" },
  { value: "agpl-3-0", label: "AGPL 3.0" },
  { value: "mpl-2-0", label: "MPL 2.0" },
  { value: "source-available", label: "Source available" },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 text-base font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{n}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function ReviewSpeed({ fastReviewAvailable }: { fastReviewAvailable: boolean }) {
  const option = "flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-surface p-4 has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent/30";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Review speed</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={option}>
          <span className="flex items-center gap-2 font-semibold">
            <input type="radio" name="reviewSpeed" value="standard" defaultChecked className="accent-[var(--accent)]" />
            Standard Review <span className="ml-auto text-sm font-medium text-muted">Free</span>
          </span>
          <span className="text-sm text-muted">
            Your submission enters our standard review queue. Reviews may take up to 15 days. No payment required.
          </span>
        </label>
        {fastReviewAvailable && (
          <label className={option}>
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name="reviewSpeed" value="fast" className="accent-[var(--accent)]" />
              Fast Review <span className="ml-auto text-sm font-medium text-accent">$5 one-time</span>
            </span>
            <span className="text-sm text-muted">
              Skip the standard queue and get your submission reviewed within 24 hours of payment. Approval is not guaranteed.
            </span>
          </label>
        )}
      </div>
      {fastReviewAvailable && (
        <p className="text-xs text-muted">
          Fast Review is a one-time fee for priority evaluation, not guaranteed publication. You can also upgrade later from your Maker
          dashboard. Paid with Freemius; if we miss the 24-hour window you can ask for a full refund.
        </p>
      )}
    </fieldset>
  );
}

export function SubmitForm({ categories, platforms, fastReviewAvailable = false }: {
  fastReviewAvailable?: boolean;
  categories: { slug: string; name: string }[];
  platforms: { value: string; label: string }[];
}) {
  const [state, action] = useActionState(submitProductAction, {} as FormState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />

      <Step n={1} title="The basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" name="name" error={e.name}>
            <TextInput name="name" required maxLength={100} placeholder="e.g. Obsidian" error={e.name} />
          </Field>
          <Field label="Website" name="websiteUrl" error={e.websiteUrl}>
            <TextInput name="websiteUrl" type="url" required placeholder="https://" error={e.websiteUrl} />
          </Field>
        </div>
        <Field label="Tagline" name="tagline" error={e.tagline} hint="One sentence that says what it does. 10–120 characters.">
          <TextInput name="tagline" required maxLength={120} placeholder="A private, local-first knowledge base" error={e.tagline} />
        </Field>
        <Field label="Description" name="description" error={e.description} hint="What problem it solves, who it is for, key features.">
          <TextArea name="description" required minLength={30} maxLength={2800} rows={6} error={e.description} />
        </Field>
      </Step>

      <Step n={2} title="Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" name="category" optional>
            <Select name="category" defaultValue="">
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="License" name="license" optional>
            <Select name="license" defaultValue="">
              <option value="">Choose a license…</option>
              {LICENSES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <CheckboxGroup name="pricing" legend="Pricing" options={PRICING} />
        <CheckboxGroup name="platforms" legend="Platforms" options={platforms} />
        <Field label="Tags" name="tags" optional hint="Comma separated, e.g. markdown, offline, sync">
          <TextInput name="tags" maxLength={400} />
        </Field>
      </Step>

      <Step n={3} title="Alternatives">
        <Field
          label="Which products is it an alternative to?"
          name="alternatives"
          optional
          hint="Comma separated app names as they appear in their URL, e.g. notion, evernote"
        >
          <TextInput name="alternatives" maxLength={400} placeholder="notion, evernote" />
        </Field>
      </Step>

      <Step n={4} title="How quickly would you like your product reviewed?">
        <ReviewSpeed fastReviewAvailable={fastReviewAvailable} />
      </Step>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Every submission is reviewed by a person before it goes live.</p>
        <SubmitButton className="sm:min-w-48">Continue</SubmitButton>
      </div>
    </form>
  );
}
