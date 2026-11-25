"use client";

import { Check } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { type FormState, submitProductAction } from "@/app/actions";
import { CheckboxGroup, Field, FormMessage, Select, SubmitButton, TextArea, TextInput } from "@/components/forms/form-kit";
import { ImageDrop } from "@/components/submit/image-drop";
import { buttonClass } from "@/components/ui/styles";

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
    <section className="rounded-[10px] border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 text-base font-semibold">
        <span className="grid size-6 place-items-center rounded-md border border-border text-xs tabular-nums text-muted">{n}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

const LISTING_PERKS = [
  "Reviewed by a person within 24 hours of payment",
  "A permanent listing with a followed link once approved",
  "Shown as an alternative on related product pages",
  "Logo, screenshots and full description on your page",
];

function ListingSummary({ price }: { price: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-accent/30 bg-accent-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Listing review · {price} one-time, or free with our badge</p>
        <p className="text-sm text-muted">Pay once for a 24-hour review, or add a link to Alternivo on your homepage and get listed free. Approval is not guaranteed.</p>
      </div>
    </div>
  );
}

/** Confirmation popup shown before the paid submission is sent; checkout opens right after. */
function PaymentDialog({ open, price, pending, onClose, onConfirm }: {
  open: boolean;
  price: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (mode: "paid" | "badge") => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(ev) => ev.target === ref.current && onClose()}
      aria-labelledby="pay-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#1f1b16] to-[#3a2414] px-6 pb-6 pt-7 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">One step left</p>
        <h2 id="pay-title" className="mt-2 text-2xl font-semibold">
          Get listed for <span className="text-orange-300">{price}</span>
        </h2>
        <p className="mt-1 text-sm text-white/75">One-time payment. No subscription, no renewal.</p>
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-orange-400/25 blur-2xl" />
      </div>
      <div className="flex flex-col gap-5 p-6">
        <ul className="flex flex-col gap-2.5 text-sm">
          {LISTING_PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          A fee for a priority human review, not guaranteed publication. If we miss the 24-hour window you can ask for a full refund.
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => onConfirm("paid")} disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
            {pending ? "Saving your submission…" : `Continue to payment · ${price}`}
          </button>
          <div className="mt-2 rounded-2xl border border-border p-4">
            <p className="text-sm font-medium">Or get listed free with our badge</p>
            <p className="mt-0.5 text-xs text-muted">
              Add the Alternivo badge (a link back to alternivo.com) to your homepage. We verify it from your Maker dashboard, then review
              your product in up to 7 days. The badge must stay on your site while you are listed.
            </p>
            <button type="button" onClick={() => onConfirm("badge")} disabled={pending} className={buttonClass("outline", "md", "mt-3 w-full")}>
              Submit free with badge
            </button>
          </div>
          <button type="button" onClick={onClose} className={buttonClass("ghost", "md", "w-full")}>
            Keep editing
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function SubmitForm({ categories, platforms, fastReviewAvailable = false, fastReviewPrice = "$5" }: {
  fastReviewAvailable?: boolean;
  fastReviewPrice?: string;
  categories: { slug: string; name: string }[];
  platforms: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(submitProductAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (state.error || state.fieldErrors) setConfirming(false);
  }, [state]);
  const send = (mode: "paid" | "badge") => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.set("reviewSpeed", mode === "paid" ? "fast" : "badge");
    startTransition(() => action(data));
  };

  return (
    <form
      // Submitted manually: a form action resets every field afterwards, so a validation error would wipe what was typed.
      ref={formRef}
      onSubmit={(ev) => {
        ev.preventDefault();
        setConfirming(true);
      }}
      className="flex flex-col gap-6"
      noValidate
    >
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

      <Step n={2} title="Logo & screenshots">
        <ImageDrop name="logoUrl" label="Logo" hint="Square PNG, JPG, WebP or GIF, up to 5 MB" max={1} />
        <ImageDrop name="screenshotUrls" label="Screenshots" hint="Up to 8 images, 5 MB each" max={8} />
      </Step>

      <Step n={3} title="Details">
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

      <Step n={4} title="Alternatives">
        <Field
          label="Which products is it an alternative to?"
          name="alternatives"
          optional
          hint="Comma separated app names as they appear in their URL, e.g. notion, evernote"
        >
          <TextInput name="alternatives" maxLength={400} placeholder="notion, evernote" />
        </Field>
      </Step>

      <Step n={5} title="Listing">
        <ListingSummary price={fastReviewPrice} />
        {!fastReviewAvailable && (
          <p className="text-sm text-muted">Card payments are briefly unavailable. Your submission is saved and you can pay from your Maker dashboard.</p>
        )}
      </Step>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Every submission is reviewed by a person before it goes live.</p>
        <SubmitButton className="sm:min-w-48" pending={pending}>Continue</SubmitButton>
      </div>
      <PaymentDialog open={confirming} price={fastReviewPrice} pending={pending} onClose={() => setConfirming(false)} onConfirm={send} />
    </form>
  );
}
