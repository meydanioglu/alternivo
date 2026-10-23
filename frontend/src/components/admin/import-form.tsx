"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { FormState } from "@/app/actions";
import { queueImportsAction } from "@/app/admin/imports/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/forms/form-kit";

export function ImportForm({ categories }: { categories: { slug: string; name: string }[] }) {
  const [state, action] = useActionState(queueImportsAction, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <FormMessage state={state} />
      <Field
        label="Ürün adresleri"
        name="lines"
        hint="Her satıra bir ürün: “https://site.com”, “Ad | https://site.com” veya “Ad | https://site.com | kategori-slug”. # ile başlayan satırlar yok sayılır."
      >
        <textarea
          id="lines"
          name="lines"
          rows={8}
          className={`${inputClass} font-mono text-xs`}
          placeholder={"Perplexity | https://www.perplexity.ai | search-engines\nhttps://www.notion.so"}
        />
      </Field>
      <Field label="Varsayılan kategori" name="categorySlug" optional hint="Satırda kategori yazmayan ürünler bu kategoriye girer.">
        <select id="categorySlug" name="categorySlug" defaultValue="" className={inputClass}>
          <option value="">— Yok —</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton className="self-start">Kuyruğa ekle</SubmitButton>
    </form>
  );
}

/** Refreshes the server-rendered list while the worker is busy. */
export function AutoRefresh({ active, seconds = 5 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [active, seconds, router]);
  return null;
}
