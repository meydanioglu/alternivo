"use client";

import { CheckCheck, ListChecks } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { approveManyAction } from "@/app/admin/content/actions";
import { FormMessage } from "@/components/forms/form-kit";
import { buttonClass, cx } from "@/components/ui/styles";
import { BULK_FORM_ID } from "./bulk-approve-id";


function Submit({ scope, children, variant, confirm }: { scope: "selected" | "all"; children: React.ReactNode; variant: "primary" | "outline"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="scope"
      value={scope}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={buttonClass(variant, "sm", "disabled:opacity-60")}
    >
      {children}
    </button>
  );
}

/**
 * Bulk approval bar. Row checkboxes elsewhere on the page join this form through form="bulk-approve",
 * so the table stays server-rendered.
 */
export function BulkApproveBar({ readyCount }: { readyCount: number }) {
  const [state, action] = useActionState(approveManyAction, {} as FormState);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids"]`));
    const update = () => setSelected(boxes().filter((b) => b.checked).length);
    document.addEventListener("change", update);
    update();
    return () => document.removeEventListener("change", update);
  }, []);

  const toggleAll = (checked: boolean) => {
    document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids"]`).forEach((b) => (b.checked = checked));
    setSelected(checked ? document.querySelectorAll(`input[form="${BULK_FORM_ID}"][name="ids"]`).length : 0);
  };

  if (readyCount === 0 && !state.ok && !state.error) return null;

  return (
    <form id={BULK_FORM_ID} action={action} className="mb-4 flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4">
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="mr-2 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" onChange={(e) => toggleAll(e.target.checked)} /> Bu sayfadakilerin tümünü seç
        </label>
        <Submit scope="selected" variant="primary">
          <ListChecks className="size-4" aria-hidden="true" /> Seçilenleri onayla{selected ? ` (${selected})` : ""}
        </Submit>
        <Submit
          scope="all"
          variant="outline"
          confirm={`Onay bekleyen ${readyCount} taslağın hepsi olduğu gibi onaylanıp ürün sayfalarına uygulansın mı?`}
        >
          <CheckCheck className="size-4" aria-hidden="true" /> Onay bekleyenlerin hepsini onayla ({readyCount})
        </Submit>
        <label className={cx("ml-auto inline-flex items-center gap-2 text-sm")}>
          <input type="checkbox" name="qualityOnly" defaultChecked className="size-4" />
          Yalnızca kaynağı yeterli olanlar
        </label>
      </div>
      <p className="text-xs text-muted">
        Toplu onay, taslağı düzenlemeden uygular: ürün sayfası güncellenir, ürün indekslenir ve sitemap&apos;e girer. “Yalnızca kaynağı
        yeterli olanlar” işaretliyken sitesinden 1.500 karakterden az metin alınabilmiş taslaklar atlanır; onları tek tek inceleyin.
      </p>
    </form>
  );
}
