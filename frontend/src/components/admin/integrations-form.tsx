"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions";
import { saveIntegrationsAction } from "@/app/admin/settings/actions";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/forms/form-kit";

export interface IntegrationSettingsView {
  payTrMerchantId: string | null;
  payTrKeySet: boolean;
  payTrSaltSet: boolean;
  payTrTestMode: boolean;
  payTrCurrency: string;
  prices: Record<string, number>;
  googleClientId: string | null;
  googleSecretSet: boolean;
  paymentProvider: string;
  lemonStoreId: string | null;
  lemonApiKeySet: boolean;
  lemonWebhookSecretSet: boolean;
  lemonTestMode: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordSet: boolean;
  smtpFrom: string | null;
}

const secretHint = (set: boolean) =>
  set ? "Tanımlı. Şifreli saklanır, gösterilmez; boş bırakırsanız korunur." : "Tanımlı değil. Şifrelenerek saklanır.";

export const PLAN_FIELDS = [
  ["fastReview", "Fast Review (tek seferlik)", 5],
  ["featured", "Featured (30 gün)", 9],
  ["growth", "Growth (30 gün)", 19],
  ["homepageSpotlight", "Homepage Spotlight (7 gün)", 5],
  ["categorySponsorship", "Category Sponsorship (7 gün)", 7],
  ["competitorSponsorship", "Competitor Page (7 gün)", 9],
  ["alternativeCard", "Sponsored Alternative Card (30 gün)", 15],
] as const;

const select = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

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
      <h3 className="font-semibold">Ödeme sağlayıcısı</h3>
      <Field label="Yeni ödemelerde kullanılacak sağlayıcı" name="paymentProvider" hint="Seçilen sağlayıcının bilgileri eksikse ödemeler kapalı görünür.">
        <select id="paymentProvider" name="paymentProvider" defaultValue={view.paymentProvider} className={select}>
          <option value="lemonsqueezy">Lemon Squeezy</option>
          <option value="paytr">PayTR</option>
        </select>
      </Field>

      <h3 className="mt-2 font-semibold">Lemon Squeezy</h3>
      <p className="-mt-2 text-sm text-muted">
        Settings → API: API anahtarı. Settings → Stores: mağaza numarası (Store ID). Settings → Webhooks: URL{" "}
        <span className="font-mono">{siteUrl}/bff/billing/lemonsqueezy</span>, olaylar <span className="font-mono">order_created</span> ve{" "}
        <span className="font-mono">order_refunded</span>; orada yazdığınız &quot;Signing secret&quot; buraya girilir. Ürünler mağazada plan
        adlarıyla (ör. &quot;Featured (30 days)&quot;) bulunmalı; tutar aşağıdaki fiyatlardan USD olarak alınır.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Store ID" name="lemonStoreId" optional>
          <TextInput name="lemonStoreId" defaultValue={view.lemonStoreId ?? ""} spellCheck={false} inputMode="numeric" />
        </Field>
        <Field label="API anahtarı" name="lemonApiKey" optional hint={secretHint(view.lemonApiKeySet)}>
          <TextInput name="lemonApiKey" type="password" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Webhook signing secret" name="lemonWebhookSecret" optional hint={secretHint(view.lemonWebhookSecretSet)}>
          <TextInput name="lemonWebhookSecret" type="password" autoComplete="off" spellCheck={false} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="lemonTestMode" defaultChecked={view.lemonTestMode} />
        Test modu (Lemon test modundaki API anahtarıyla birlikte kullanın; gerçek para çekilmez)
      </label>

      <h3 className="mt-2 font-semibold">PayTR</h3>
      <p className="-mt-2 text-sm text-muted">
        PayTR Mağaza Paneli → Bilgi sayfasındaki API bilgileri. Mağaza Paneli → Destek &amp; Kurulum → Ayarlar → Bildirim URL:{" "}
        <span className="font-mono">{siteUrl}/bff/billing/paytr</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mağaza no (merchant_id)" name="payTrMerchantId" optional>
          <TextInput name="payTrMerchantId" defaultValue={view.payTrMerchantId ?? ""} spellCheck={false} inputMode="numeric" />
        </Field>
        <Field label="merchant_key" name="payTrMerchantKey" optional hint={secretHint(view.payTrKeySet)}>
          <TextInput name="payTrMerchantKey" type="password" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="merchant_salt" name="payTrMerchantSalt" optional hint={secretHint(view.payTrSaltSet)}>
          <TextInput name="payTrMerchantSalt" type="password" autoComplete="off" spellCheck={false} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Para birimi" name="payTrCurrency" hint="Döviz ile tahsilat için PayTR hesabınızda döviz desteği açık olmalı.">
          <select id="payTrCurrency" name="payTrCurrency" defaultValue={view.payTrCurrency} className={select}>
            <option value="TL">TL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="payTrTestMode" defaultChecked={view.payTrTestMode} />
          Test modu (gerçek para çekilmez; PayTR test kartlarıyla deneyin)
        </label>
      </div>
      <p className="text-sm text-muted">
        Fiyatlar seçili para biriminde, <strong>kuruş/sent</strong> olarak değil normal tutar olarak girin (ör. 199 veya 4.99). Boş bırakılan
        plan satışa kapalıdır. Sitede gösterilen fiyat da buradan gelir.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_FIELDS.map(([key, label, usd]) => (
          <Field key={key} label={label} name={`price_${key}`} optional hint={`Önerilen: ${usd} USD`}>
            <TextInput
              name={`price_${key}`}
              defaultValue={view.prices?.[key] ? String(view.prices[key] / 100) : ""}
              inputMode="decimal"
              spellCheck={false}
            />
          </Field>
        ))}
      </div>

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
