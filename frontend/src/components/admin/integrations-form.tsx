"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions";
import { saveIntegrationsAction } from "@/app/admin/settings/actions";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

export interface IntegrationSettingsView {
  googleClientId: string | null;
  googleSecretSet: boolean;
  freemiusProductId: string | null;
  freemiusPublicKey: string | null;
  freemiusSecretKeySet: boolean;
  freemiusTestMode: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordSet: boolean;
  smtpFrom: string | null;
}

const secretHint = (set: boolean) =>
  set ? "Tanımlı. Şifreli saklanır, gösterilmez; boş bırakırsanız korunur." : "Tanımlı değil. Şifrelenerek saklanır.";

export function IntegrationsForm({ view, siteUrl }: { view: IntegrationSettingsView; siteUrl: string }) {
  const [state, action] = useActionState(saveIntegrationsAction, {} as FormState);
  return (
    <form
      // Submitted manually: a form action would reset every field afterwards, losing the choices and typed secrets when a save fails.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4"
    >
      <FormMessage state={state} />
      <h3 className="font-semibold">Ödemeler (Freemius)</h3>
      <p className="-mt-2 text-sm text-muted">
        Freemius → ürün → Settings → Keys: Product ID, Public Key (pk_…) ve Secret Key (sk_…). Webhooks → Listeners: URL{" "}
        <span className="font-mono">{siteUrl}/bff/billing/freemius</span>, olaylar <span className="font-mono">payment.created</span> ve{" "}
        <span className="font-mono">payment.refund</span>. Planlar Freemius&apos;ta katalog fiyatlarıyla tanımlı; ödeme alıcının hesap e-postasıyla eşleşir.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Product ID" name="freemiusProductId" optional>
          <TextInput name="freemiusProductId" defaultValue={view.freemiusProductId ?? ""} spellCheck={false} inputMode="numeric" />
        </Field>
        <Field label="Public key" name="freemiusPublicKey" optional>
          <TextInput name="freemiusPublicKey" defaultValue={view.freemiusPublicKey ?? ""} spellCheck={false} />
        </Field>
        <Field label="Secret key" name="freemiusSecretKey" optional hint={secretHint(view.freemiusSecretKeySet)}>
          <TextInput name="freemiusSecretKey" type="password" autoComplete="off" spellCheck={false} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="freemiusTestMode" defaultChecked={view.freemiusTestMode} />
        Test modu (Freemius sandbox checkout; gerçek para çekilmez)
      </label>

      <h3 className="mt-2 font-semibold">E-posta (SMTP)</h3>
      <p className="-mt-2 text-sm text-muted">
        Doğrulama ve şifre sıfırlama e-postaları buradan gider. Brevo: SMTP &amp; API → SMTP sekmesindeki sunucu, port ve login; şifre
        olarak &quot;Generate SMTP key&quot; ile oluşturulan anahtar. Gönderen adresin alan adı Brevo&apos;da doğrulanmış olmalı.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sunucu" name="smtpHost" optional>
          <TextInput name="smtpHost" defaultValue={view.smtpHost ?? ""} placeholder="smtp-relay.brevo.com" spellCheck={false} />
        </Field>
        <Field label="Port" name="smtpPort" optional>
          <TextInput name="smtpPort" defaultValue={view.smtpPort ? String(view.smtpPort) : ""} placeholder="587" inputMode="numeric" />
        </Field>
        <Field label="Kullanıcı adı (login)" name="smtpUsername" optional>
          <TextInput name="smtpUsername" defaultValue={view.smtpUsername ?? ""} spellCheck={false} autoComplete="off" />
        </Field>
        <Field label="Şifre / SMTP anahtarı" name="smtpPassword" optional hint={secretHint(view.smtpPasswordSet)}>
          <TextInput name="smtpPassword" type="password" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Gönderen adresi" name="smtpFrom" optional>
          <TextInput name="smtpFrom" defaultValue={view.smtpFrom ?? ""} placeholder="no-reply@alternivo.com" spellCheck={false} />
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
