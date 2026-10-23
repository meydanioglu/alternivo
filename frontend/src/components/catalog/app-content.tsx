import { CircleCheck, CircleMinus, CirclePlus } from "lucide-react";
import type { ContentSections } from "@/lib/api/types";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-foreground/85">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** Editor-approved long-form sections for a product page. Empty sections are not rendered. */
export function AppContentSections({ name, content }: { name: string; content: ContentSections }) {
  return (
    <>
      {content.features.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Key features of {name}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {content.features.map((f) => (
              <li key={f.name} className="rounded-lg border border-border bg-surface p-4">
                <h3 className="flex items-center gap-2 font-medium">
                  <CircleCheck className="size-4 shrink-0 text-accent" aria-hidden="true" /> {f.name}
                </h3>
                {f.description && <p className="mt-1 text-sm text-foreground/80">{f.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(content.useCases.length > 0 || content.audience.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {content.useCases.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">What {name} is used for</h2>
              <Bullets items={content.useCases} />
            </section>
          )}
          {content.audience.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Who {name} is for</h2>
              <Bullets items={content.audience} />
            </section>
          )}
        </div>
      )}

      {(content.pros.length > 0 || content.cons.length > 0) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{name} pros and cons</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.pros.length > 0 && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                <h3 className="mb-2 text-sm font-semibold text-success">Pros</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {content.pros.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CirclePlus className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.cons.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                <h3 className="mb-2 text-sm font-semibold text-danger">Cons</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {content.cons.map((c) => (
                    <li key={c} className="flex gap-2">
                      <CircleMinus className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
