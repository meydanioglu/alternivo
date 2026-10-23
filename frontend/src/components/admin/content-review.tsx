"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { approveContentAction } from "@/app/admin/content/actions";
import { FormMessage, SubmitButton, inputClass } from "@/components/forms/form-kit";
import { cx } from "@/components/ui/styles";

export interface Sections {
  features: { name: string; description: string }[];
  useCases: string[];
  audience: string[];
  pros: string[];
  cons: string[];
  faq: { question: string; answer: string }[];
}

function Counted({ name, label, initial, min, max, rows, hint }: {
  name: string;
  label: string;
  initial: string;
  min?: number;
  max: number;
  rows?: number;
  hint?: string;
}) {
  const [value, setValue] = useState(initial);
  const n = value.trim().length;
  const bad = n > max || (min !== undefined && n < min);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        <span className={cx("text-xs tabular-nums", bad ? "text-danger" : "text-muted")}>
          {n}
          {min !== undefined ? ` / ${min}–${max}` : ` / ${max}`}
        </span>
      </div>
      {rows ? (
        <textarea id={name} name={name} rows={rows} value={value} onChange={(e) => setValue(e.target.value)} className={cx(inputClass, "resize-y leading-relaxed")} />
      ) : (
        <input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Lines({ name, label, initial, hint, rows = 4 }: { name: string; label: string; initial: string; hint: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <textarea id={name} name={name} rows={rows} defaultValue={initial} className={cx(inputClass, "resize-y text-sm leading-relaxed")} />
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

export function ContentReviewForm({ id, nextId, draft, canApprove }: {
  id: string;
  nextId: string | null;
  draft: { shortDescription: string; description: string; seoTitle: string; seoDescription: string; sections: Sections };
  canApprove: boolean;
}) {
  const [state, action] = useActionState(approveContentAction, {} as FormState);
  const s = draft.sections;
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={nextId ?? ""} />
      <FormMessage state={state} />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Arama sonuçlarında görünen</h2>
        <Counted name="seoTitle" label="SEO başlığı" initial={draft.seoTitle} max={60} hint="Google başlığı. Sonuna “| Alternivo” otomatik eklenir." />
        <Counted name="seoDescription" label="Meta açıklama" initial={draft.seoDescription} min={130} max={160} rows={2} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Ürün metni</h2>
        <Counted name="shortDescription" label="Kısa açıklama" initial={draft.shortDescription} min={60} max={200} rows={2} hint="Kartlarda, listelerde ve sayfanın üstünde görünür." />
        <Counted name="description" label="Uzun açıklama" initial={draft.description} max={10000} rows={12} hint="Paragrafları boş satırla ayırın." />
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-surface p-5 lg:grid-cols-2">
        <h2 className="font-semibold lg:col-span-2">Bölümler</h2>
        <div className="lg:col-span-2">
          <Lines name="features" label="Özellikler" rows={6} initial={s.features.map((f) => `${f.name}: ${f.description}`).join("\n")} hint="Her satır “Ad: açıklama”." />
        </div>
        <Lines name="useCases" label="Kullanım alanları" initial={s.useCases.join("\n")} hint="Her satıra bir madde." />
        <Lines name="audience" label="Kimler için" initial={s.audience.join("\n")} hint="Her satıra bir madde." />
        <Lines name="pros" label="Artılar" initial={s.pros.join("\n")} hint="Her satıra bir madde." />
        <Lines name="cons" label="Eksiler" initial={s.cons.join("\n")} hint="Her satıra bir madde. Kaynakta dayanağı yoksa boş bırakın." />
        <div className="lg:col-span-2">
          <Lines
            name="faq"
            label="Sık sorulan sorular"
            rows={10}
            initial={s.faq.map((q) => `${q.question}\n${q.answer}`).join("\n\n")}
            hint="Her soru bloğu: ilk satır soru, alt satır cevap; bloklar arasında boş satır."
          />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" defaultChecked className="size-4" /> Ürün taslaksa yayınla
        </label>
        {canApprove ? <SubmitButton>Onayla ve uygula{nextId ? " → sonraki" : ""}</SubmitButton> : <span className="text-sm text-muted">Bu taslak hâlâ yazılıyor.</span>}
      </div>
    </form>
  );
}
