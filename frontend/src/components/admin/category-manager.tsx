"use client";

import { Pencil, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { FormState } from "@/app/actions";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { Field, FormMessage, SubmitButton, TextInput, inputClass } from "@/components/forms/form-kit";
import { buttonClass } from "@/components/ui/styles";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  icon: string | null;
  isFeatured: boolean;
  sortOrder: number;
  applicationCount: number;
}

function CategoryForm({ category, all, onDone }: { category: CategoryRow | null; all: CategoryRow[]; onDone: () => void }) {
  const router = useRouter();
  const [state, action] = useActionState(saveCategoryAction, {} as FormState);
  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-accent/40 bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{category ? `Düzenle: ${category.name}` : "Yeni kategori"}</h2>
        <button type="button" onClick={onDone} className={buttonClass("ghost", "sm")} aria-label="Kapat">
          <X className="size-4" />
        </button>
      </div>
      {category && <input type="hidden" name="id" value={category.id} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad" name="name">
          <TextInput name="name" defaultValue={category?.name} required maxLength={80} />
        </Field>
        <Field label="Slug" name="slug" hint="Boşsa addan üretilir.">
          <TextInput name="slug" defaultValue={category?.slug} maxLength={120} />
        </Field>
        <Field label="Üst kategori" name="parentSlug" optional>
          <select id="parentSlug" name="parentSlug" defaultValue={category?.parentSlug ?? ""} className={inputClass}>
            <option value="">— Ana kategori —</option>
            {all
              .filter((c) => !c.parentSlug && c.id !== category?.id)
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="İkon" name="icon" optional hint="Lucide ikon adı, ör. sparkles, bot, image">
          <TextInput name="icon" defaultValue={category?.icon ?? ""} maxLength={40} />
        </Field>
        <Field label="Sıra" name="sortOrder">
          <TextInput name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} />
        </Field>
        <label className="mt-6 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={category?.isFeatured} className="size-4" /> Ana sayfada öne çıkar
        </label>
      </div>
      <Field label="Açıklama" name="description" optional>
        <TextInput name="description" defaultValue={category?.description ?? ""} maxLength={500} />
      </Field>
      <SubmitButton className="self-start">{category ? "Kaydet" : "Ekle"}</SubmitButton>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [q, setQ] = useState("");
  const shown = useMemo(
    () => categories.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase())),
    [categories, q],
  );
  const close = () => setEditing(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`${categories.length} kategoride ara…`}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button type="button" onClick={() => setEditing("new")} className={buttonClass("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" /> Kategori ekle
        </button>
      </div>

      {editing && (
        <CategoryForm key={editing === "new" ? "new" : editing.id} category={editing === "new" ? null : editing} all={categories} onDone={close} />
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Üst</th>
              <th className="px-4 py-3 font-medium">Uygulama</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5">
                  <a href={`/category/${c.slug}`} target="_blank" className="font-medium hover:underline">
                    {c.name}
                  </a>
                  {c.isFeatured && <span className="ml-2 text-xs text-accent">öne çıkan</span>}
                  <p className="text-xs text-muted">/{c.slug}</p>
                </td>
                <td className="px-4 py-2.5 text-muted">{c.parentSlug ?? "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{c.applicationCount}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setEditing(c)} className={buttonClass("outline", "sm")}>
                      <Pencil className="size-3.5" aria-hidden="true" /> Düzenle
                    </button>
                    <ActionButton
                      action={deleteCategoryAction.bind(null, c.id)}
                      variant="ghost"
                      className="text-danger"
                      confirm={`"${c.name}" kategorisi silinsin mi?`}
                    >
                      Sil
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
