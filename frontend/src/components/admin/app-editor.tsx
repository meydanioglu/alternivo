"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { saveApplicationAction } from "@/app/admin/actions";
import { Field, FormMessage, SubmitButton, TextArea, TextInput, inputClass } from "@/components/forms/form-kit";
import { cx } from "@/components/ui/styles";

export interface AppDetail {
  id: string;
  status: string;
  version: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  developer: string | null;
  pricing: string[];
  licenseSlug: string | null;
  isSelfHostable: boolean;
  isPrivacyFocused: boolean;
  hasOfflineSupport: boolean;
  editorialScore: number;
  releasedOn: string | null;
  primaryCategorySlug: string | null;
  categorySlugs: string[];
  platformSlugs: string[];
  featureSlugs: string[];
  tagSlugs: string[];
  aliases: string[];
}

const PRICING = [
  ["free", "Ücretsiz"],
  ["freemium", "Freemium"],
  ["free-trial", "Deneme sürümü"],
  ["paid", "Ücretli"],
  ["subscription", "Abonelik"],
  ["one-time-purchase", "Tek seferlik"],
] as const;

const LICENSES = [
  ["proprietary", "Proprietary"],
  ["mit", "MIT"],
  ["apache-2-0", "Apache 2.0"],
  ["gpl-2-0", "GPL 2.0"],
  ["gpl-3-0", "GPL 3.0"],
  ["agpl-3-0", "AGPL 3.0"],
  ["mpl-2-0", "MPL 2.0"],
  ["postgresql", "PostgreSQL"],
  ["public-domain", "Public domain"],
  ["sspl", "SSPL"],
  ["source-available", "Source available"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

function Chips({ name, options, selected }: { name: string; options: readonly (readonly [string, string])[]; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label
          key={value}
          className="inline-flex cursor-pointer items-center rounded-full border border-border px-3 py-1.5 text-sm transition has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
        >
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

export function AppEditor({ app, categories, platforms }: {
  app: AppDetail | null;
  categories: { slug: string; name: string }[];
  platforms: { slug: string; name: string }[];
}) {
  const [state, action] = useActionState(saveApplicationAction, {} as FormState);
  const [logo, setLogo] = useState(app?.logoUrl ?? "");
  const [catFilter, setCatFilter] = useState("");
  const shownCats = categories.filter(
    (c) => !catFilter || c.name.toLowerCase().includes(catFilter.toLowerCase()) || app?.categorySlugs.includes(c.slug),
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {app && <input type="hidden" name="id" value={app.id} />}
      {app && <input type="hidden" name="version" value={app.version} />}
      <FormMessage state={state} />

      <Section title="Temel bilgiler">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" name="name">
            <TextInput name="name" defaultValue={app?.name} required maxLength={100} />
          </Field>
          <Field label="Slug (URL)" name="slug" hint="Boş bırakılırsa addan üretilir. Değiştirilirse eski adres otomatik yönlendirilir.">
            <TextInput name="slug" defaultValue={app?.slug} maxLength={120} />
          </Field>
        </div>
        <Field label="Kısa açıklama" name="shortDescription" hint="Kartlarda ve arama sonuçlarında görünür. En fazla 200 karakter.">
          <TextInput name="shortDescription" defaultValue={app?.shortDescription} required maxLength={200} />
        </Field>
        <Field label="Açıklama" name="description" optional>
          <TextArea name="description" defaultValue={app?.description ?? ""} rows={7} maxLength={10000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Web sitesi" name="websiteUrl" optional>
            <TextInput name="websiteUrl" type="url" defaultValue={app?.websiteUrl ?? ""} placeholder="https://" />
          </Field>
          <Field label="Geliştirici" name="developer" optional>
            <TextInput name="developer" defaultValue={app?.developer ?? ""} maxLength={100} />
          </Field>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Logo adresi" name="logoUrl" optional hint="Kare, en az 256×256 px PNG/SVG/WebP görselin https adresi. Boş bırakılırsa baş harf gösterilir.">
              <TextInput name="logoUrl" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
            </Field>
          </div>
          <span className="mb-6 grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" className="size-full object-contain" /> : <span className="text-xs text-muted">logo</span>}
          </span>
        </div>
      </Section>

      <Section title="Kategoriler">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ana kategori" name="primaryCategorySlug">
            <select id="primaryCategorySlug" name="primaryCategorySlug" defaultValue={app?.primaryCategorySlug ?? ""} className={inputClass}>
              <option value="">Seçin…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Diğer kategorileri filtrele" name="catFilter">
            <TextInput name="catFilter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} placeholder="Ara…" />
          </Field>
        </div>
        <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-3">
          {categories.map((c) => (
            <label key={c.slug} className={cx("flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-secondary", !shownCats.includes(c) && "hidden")}>
              <input type="checkbox" name="categorySlugs" value={c.slug} defaultChecked={app?.categorySlugs.includes(c.slug)} />
              <span className="truncate">{c.name}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Fiyat, lisans ve platform">
        <div>
          <p className="mb-2 text-sm font-medium">Fiyatlandırma</p>
          <Chips name="pricing" options={PRICING} selected={app?.pricing ?? []} />
        </div>
        <Field label="Lisans" name="licenseSlug" optional>
          <select id="licenseSlug" name="licenseSlug" defaultValue={app?.licenseSlug ?? ""} className={inputClass}>
            <option value="">Bilinmiyor</option>
            {LICENSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">Platformlar</p>
          <Chips name="platformSlugs" options={platforms.map((p) => [p.slug, p.name] as const)} selected={app?.platformSlugs ?? []} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check name="isSelfHostable" label="Kendi sunucunda barındırılabilir" defaultChecked={app?.isSelfHostable} />
          <Check name="isPrivacyFocused" label="Gizlilik odaklı" defaultChecked={app?.isPrivacyFocused} />
          <Check name="hasOfflineSupport" label="Çevrimdışı çalışır" defaultChecked={app?.hasOfflineSupport} />
        </div>
      </Section>

      <Section title="Ek bilgiler">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Editör puanı (0-100)" name="editorialScore" hint="Sıralamada eşitlik bozucu.">
            <TextInput name="editorialScore" type="number" min={0} max={100} defaultValue={app?.editorialScore ?? 0} />
          </Field>
          <Field label="İlk yayın tarihi" name="releasedOn" optional>
            <TextInput name="releasedOn" type="date" defaultValue={app?.releasedOn ?? ""} />
          </Field>
          <Field label="Diğer adları" name="aliases" optional hint="Virgülle ayırın.">
            <TextInput name="aliases" defaultValue={app?.aliases.join(", ")} />
          </Field>
        </div>
        <Field label="Etiketler" name="tagSlugs" optional hint="Virgülle ayırın; yoksa oluşturulur.">
          <TextInput name="tagSlugs" defaultValue={app?.tagSlugs.join(", ")} />
        </Field>
        <Field label="Özellikler (slug)" name="featureSlugs" optional hint="Mevcut özellik slug'ları, virgülle. Örn: offline-mode, real-time-collaboration">
          <TextInput name="featureSlugs" defaultValue={app?.featureSlugs.join(", ")} />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Check name="markVerified" label="Editör tarafından doğrulandı olarak işaretle" />
          {app?.status !== "Published" && <Check name="publish" label="Kaydettikten sonra yayınla" defaultChecked={!app} />}
        </div>
        <SubmitButton>{app ? "Değişiklikleri kaydet" : "Uygulamayı oluştur"}</SubmitButton>
      </div>
    </form>
  );
}
