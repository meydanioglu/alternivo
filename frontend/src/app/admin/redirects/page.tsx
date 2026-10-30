"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { createRedirectAction } from "@/app/admin/actions";
import { AdminHeader } from "@/components/admin/admin-parts";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput, inputClass } from "@/components/forms/form-kit";

export default function AdminRedirectsPage() {
  const [state, action] = useActionState(createRedirectAction, {} as FormState);
  return (
    <>
      <AdminHeader
        title="Yönlendirmeler"
        description="Eski bir adresi yenisine yönlendirin veya kalıcı olarak kaldırıldı (410) olarak işaretleyin. Uygulama slug'ı değişince yönlendirme otomatik eklenir."
      />
      <ActionForm action={action} state={state} className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <FormMessage state={state} />
        <Field label="Eski adres" name="fromPath" hint="Sitedeki yol, ör. /software/eski-ad">
          <TextInput name="fromPath" required placeholder="/software/eski-ad" />
        </Field>
        <Field label="Yeni adres" name="toPath" optional hint="410 seçtiyseniz boş bırakın.">
          <TextInput name="toPath" placeholder="/software/yeni-ad" />
        </Field>
        <Field label="Tür" name="statusCode">
          <select id="statusCode" name="statusCode" defaultValue="301" className={inputClass}>
            <option value="301">301 — Kalıcı yönlendirme</option>
            <option value="308">308 — Kalıcı yönlendirme (metodu korur)</option>
            <option value="410">410 — Kaldırıldı</option>
          </select>
        </Field>
        <SubmitButton className="self-start">Kaydet</SubmitButton>
      </ActionForm>
    </>
  );
}
