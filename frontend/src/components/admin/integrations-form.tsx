"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { saveIntegrationsAction } from "@/app/admin/settings/actions";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

export interface IntegrationSettingsView {
  freemiusProductId: string | null;
  freemiusPublicKey: string | null;
  freemiusSecretSet: boolean;
  featuredPlanId: string | null;
  fastTrackPlanId: string | null;
  launchBoostPlanId: string | null;
  googleClientId: string | null;
  googleSecretSet: boolean;
}

const secretHint = (set: boolean) =>
  set ? "Tanımlı. Şifreli saklanır, gösterilmez; boş bırakırsanız korunur." : "Tanımlı değil. Şifrelenerek saklanır.";

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
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Featured plan ID" name="featuredPlanId" optional hint="Aylık öne çıkarma">
          <TextInput name="featuredPlanId" defaultValue={view.featuredPlanId ?? ""} spellCheck={false} />
        </Field>
        <Field label="Fast track plan ID" name="fastTrackPlanId" optional hint="Hızlı inceleme">
          <TextInput name="fastTrackPlanId" defaultValue={view.fastTrackPlanId ?? ""} spellCheck={false} />
        </Field>
        <Field label="Launch boost plan ID" name="launchBoostPlanId" optional hint="Buildboard'da sabitleme">
          <TextInput name="launchBoostPlanId" defaultValue={view.launchBoostPlanId ?? ""} spellCheck={false} />
        </Field>
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
