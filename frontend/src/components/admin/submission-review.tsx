"use client";

import { Check, PencilLine, Save, X } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { reviewSubmissionAction } from "@/app/admin/submissions/actions";
import { ActionForm, Field, FormMessage, TextArea, TextInput, inputClass } from "@/components/forms/form-kit";
import { buttonClass, cx } from "@/components/ui/styles";

export interface SubmissionData {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  categorySlug: string | null;
  pricing: string[];
  licenseSlug: string | null;
  platforms: string[];
  tags: string[];
  suggestedAlternatives: string[];
  status: string;
  moderatorNote: string | null;
}

const PRICING = [
  ["free", "Ücretsiz"],
  ["freemium", "Freemium"],
  ["free-trial", "Deneme"],
  ["paid", "Ücretli"],
  ["subscription", "Abonelik"],
  ["one-time-purchase", "Tek seferlik"],
] as const;

function Chips({ name, options, selected, disabled }: { name: string; options: readonly (readonly [string, string])[]; selected: string[]; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label
          key={value}
          className="inline-flex cursor-pointer items-center rounded-full border border-border px-3 py-1.5 text-sm transition has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
        >
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} disabled={disabled} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

function DecisionButton({ value, children, variant, className }: { value: string; children: React.ReactNode; variant: "primary" | "outline" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="decision" value={value} disabled={pending} className={buttonClass(variant, "md", cx("disabled:opacity-60", className))}>
      {children}
    </button>
  );
}

export function SubmissionReviewForm({ submission: s, categories, platforms, licenses }: {
  submission: SubmissionData;
  categories: { slug: string; name: string }[];
  platforms: { slug: string; name: string }[];
  licenses: readonly (readonly [string, string])[];
}) {
  const [state, action] = useActionState(reviewSubmissionAction, {} as FormState);
  const locked = s.status === "Approved";

  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={s.id} />
      <input type="hidden" name="editable" value={locked ? "0" : "1"} />
      <FormMessage state={state} />

      <fieldset disabled={locked} className="flex flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Ürün bilgileri {locked && <span className="text-sm font-normal text-muted">(onaylandı — uygulama sayfasından düzenleyin)</span>}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ürün adı" name="name">
              <TextInput name="name" defaultValue={s.name} maxLength={100} required />
            </Field>
            <Field label="Web sitesi" name="websiteUrl">
              <TextInput name="websiteUrl" type="url" defaultValue={s.websiteUrl} required />
            </Field>
          </div>
          <Field label="Açıklama (gönderenin yazdığı)" name="description" hint="İlk satır kısa açıklama olarak kullanılır. Onaydan sonra yapay zekâ ayrıca zengin içerik taslağı hazırlar.">
            <TextArea name="description" defaultValue={s.description} rows={7} maxLength={3000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori" name="categorySlug">
              <select id="categorySlug" name="categorySlug" defaultValue={s.categorySlug ?? ""} className={inputClass}>
                <option value="">— Seçin —</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lisans" name="licenseSlug">
              <select id="licenseSlug" name="licenseSlug" defaultValue={s.licenseSlug ?? ""} className={inputClass}>
                <option value="">Bilinmiyor</option>
                {licenses.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Fiyatlandırma</p>
            <Chips name="pricing" options={PRICING} selected={s.pricing} disabled={locked} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Platformlar</p>
            <Chips name="platforms" options={platforms.map((p) => [p.slug, p.name] as const)} selected={s.platforms} disabled={locked} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Etiketler" name="tags" optional hint="Virgülle ayırın.">
              <TextInput name="tags" defaultValue={s.tags.join(", ")} />
            </Field>
            <Field label="Alternatifi olduğu ürünler" name="alternatives" optional hint="Ürün adresleri (slug), virgülle: notion, evernote">
              <TextInput name="alternatives" defaultValue={s.suggestedAlternatives.join(", ")} />
            </Field>
          </div>
        </section>
      </fieldset>

      {!locked && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Karar</h2>
          <Field label="Gönderene not" name="note" optional hint="Değişiklik istediğinizde veya reddettiğinizde gönderen bu notu hesabında görür.">
            <TextArea name="note" defaultValue={s.moderatorNote ?? ""} rows={2} maxLength={500} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <DecisionButton value="approve" variant="primary">
              <Check className="size-4" aria-hidden="true" /> Onayla ve yayınla
            </DecisionButton>
            <DecisionButton value="needs-changes" variant="outline">
              <PencilLine className="size-4" aria-hidden="true" /> Değişiklik iste
            </DecisionButton>
            <DecisionButton value="reject" variant="ghost" className="text-danger">
              <X className="size-4" aria-hidden="true" /> Reddet
            </DecisionButton>
            <DecisionButton value="save" variant="ghost" className="ml-auto">
              <Save className="size-4" aria-hidden="true" /> Sadece kaydet
            </DecisionButton>
          </div>
          <p className="text-xs text-muted">Onayladığınızda ürün yayına girer, alternatif ilişkileri kurulur ve ürün haftalık lansman panosuna eklenir.</p>
        </section>
      )}
    </ActionForm>
  );
}
