"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { saveIntegrationsAction } from "@/app/admin/settings/actions";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

export interface IntegrationSettingsView {
  freemiusProductId: string | null;
  freemiusPublicKey: string | null;
  freemiusSecretSet: boolean;
  plans: Record<string, string>;
  googleClientId: string | null;
  googleSecretSet: boolean;
}

const secretHint = (set: boolean) =>
  set ? "Tanımlı. Şifreli saklanır, gösterilmez; boş bırakırsanız korunur." : "Tanımlı değil. Şifrelenerek saklanır.";

export const PLAN_FIELDS = [
  ["fastReview", "Fast Review ($5, tek seferlik)"],
  ["featured", "Featured ($9/ay)"],
  ["growth", "Growth ($19/ay)"],
  ["homepageSpotlight", "Homepage Spotlight ($5, 7 gün)"],
  ["categorySponsorship", "Category Sponsorship ($7, 7 gün)"],
  ["competitorSponsorship", "Competitor Page ($9, 7 gün)"],
  ["alternativeCard", "Sponsored Alternative Card ($15, 30 gün)"],
] as const;

export function IntegrationsForm({ view, siteUrl }: { view: IntegrationSettingsView; siteUrl: string }) {
  const [state, action] = useActionState(saveIntegrationsAction, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <h3 className="font-semibold">Freemius (ödemeler)</h3>
      <p className="-mt-2 text-sm text-muted">
        Freemius → Product → Settings → Keys. Webhook adresi: <span className="font-mono">{siteUrl}/bff/billing/freemius</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product ID" name="freemiusProductId" optional>
          <TextInput name="freemiusProductId" defaultValue={view.freemiusProductId ?? ""} spellCheck={false} />
        </Field>
        <Field label="Public key" name="freemiusPublicKey" optional>
          <TextInput name="freemiusPublicKey" defaultValue={view.freemiusPublicKey ?? ""} spellCheck={false} placeholder="pk_..." />
        </Field>
      </div>
      <Field label="Secret key" name="freemiusSecretKey" optional hint={secretHint(view.freemiusSecretSet)}>
        <TextInput name="freemiusSecretKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk_..." />
      </Field>
      <p className="text-sm text-muted">
        Plan ID&apos;leri: Freemius → Plans. Fiyatı Freemius&apos;taki planla aynı tutun (tek seferlik planlar &quot;lifetime&quot;, aylıklar &quot;monthly&quot;).
        Boş bırakılan planın satın alma butonu gösterilmez.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} name={`plan_${key}`} optional>
            <TextInput name={`plan_${key}`} defaultValue={view.plans?.[key] ?? ""} spellCheck={false} inputMode="numeric" />
          </Field>
        ))}
      </div>

      <h3 className="mt-2 font-semibold">Google ile giriş</h3>
      <p className="-mt-2 text-sm text-muted">
        Google Cloud → APIs &amp; Services → Credentials → OAuth client (Web). Yetkili yönlendirme adresi:{" "}
        <span className="font-mono">{siteUrl}/bff/auth/google/callback</span>
      </p>
      <Field label="Client ID" name="googleClientId" optional>
        <TextInput name="googleClientId" defaultValue={view.googleClientId ?? ""} spellCheck={false} />
      </Field>
      <Field label="Client secret" name="googleClientSecret" optional hint={secretHint(view.googleSecretSet)}>
        <TextInput name="googleClientSecret" type="password" autoComplete="off" spellCheck={false} />
      </Field>
      <div>
        <SubmitButton>Entegrasyonları kaydet</SubmitButton>
      </div>
    </form>
  );
}
