import { Minus, Plus } from "lucide-react";
import type { ContentSections } from "@/lib/api/types";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-[15px] text-foreground/85">
      {items.map((i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
          {i}
        </li>
      ))}
    </ul>
  );
}

/**
 * Editor-approved long-form sections for a product page. Features read as "name — explanation" rows rather than
 * a wall of cards; pros and cons sit side by side. Empty sections are not rendered.
 */
export function AppContentSections({ name, content }: { name: string; content: ContentSections }) {
  return (
    <>
      {content.features.length > 0 && (
        <section id="features" className="anchor-section">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Key features of {name}</h2>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {content.features.map((f) => (
              <div key={f.name} className="border-t border-border py-3">
                <dt className="font-medium">{f.name}</dt>
                {f.description && <dd className="mt-0.5 text-sm text-muted">{f.description}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      {(content.useCases.length > 0 || content.audience.length > 0) && (
        <div className="grid gap-8 sm:grid-cols-2">
          {content.useCases.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">What {name} is used for</h2>
              <Bullets items={content.useCases} />
            </section>
          )}
          {content.audience.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Who it suits</h2>
              <Bullets items={content.audience} />
            </section>
          )}
        </div>
      )}

      {(content.pros.length > 0 || content.cons.length > 0) && (
        <section id="pros-cons" className="anchor-section">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">{name} pros and cons</h2>
          <div className="grid overflow-hidden rounded-[10px] border border-border sm:grid-cols-2">
            {content.pros.length > 0 && (
              <div className="p-5">
                <h3 className="eyebrow mb-3">Strengths</h3>
                <ul className="flex flex-col gap-2 text-[15px]">
                  {content.pros.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <Plus className="mt-1 size-3.5 shrink-0 text-success" aria-label="Pro" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.cons.length > 0 && (
              <div className="border-t border-border p-5 sm:border-l sm:border-t-0">
                <h3 className="eyebrow mb-3">Limitations</h3>
                <ul className="flex flex-col gap-2 text-[15px]">
                  {content.cons.map((c) => (
                    <li key={c} className="flex gap-2.5">
                      <Minus className="mt-1 size-3.5 shrink-0 text-danger" aria-label="Con" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Editorial summary based on the product&apos;s official information.</p>
        </section>
      )}
    </>
  );
}
