import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { bestPage } from "@/content/best-pages";
import { guide } from "@/content/guides";
import { ALTERNATIVE_TARGETS } from "@/content/keyword-targets";
import type { AlternativeItem } from "@/lib/api/types";
import { faqJsonLd } from "@/lib/seo";

const isFree = (i: AlternativeItem) => i.application.pricing.some((p) => p === "free" || p === "freemium");

/**
 * Answers the common variants of "{X} alternatives" searches (free, open-source, "apps like X") from the real
 * listing data, and links to the use-case lists that cover the rest ("for beginners", "for mobile apps", …).
 */
export function AlternativesIntents({ sourceSlug, sourceName, items }: { sourceSlug: string; sourceName: string; items: AlternativeItem[] }) {
  if (items.length === 0) return null;
  const free = items.filter(isFree).slice(0, 6);
  const open = items.filter((i) => i.application.isOpenSource).slice(0, 6);
  const top = items.slice(0, 5).map((i) => i.application.name);
  const related = (ALTERNATIVE_TARGETS[sourceSlug] ?? [])
    .map((s) => (bestPage(s) ? { href: `/best/${s}`, label: bestPage(s)!.title } : guide(s) ? { href: `/guides/${s}`, label: guide(s)!.title } : null))
    .filter((x): x is { href: string; label: string } => x !== null);

  const faq = [
    { question: `What are the best ${sourceName} alternatives?`, answer: `Top-ranked alternatives to ${sourceName} include ${top.join(", ")}.` },
    ...(free.length > 0
      ? [{ question: `Are there free ${sourceName} alternatives?`, answer: `Yes. ${free.map((i) => i.application.name).join(", ")} offer a free plan or are free to use.` }]
      : []),
    ...(open.length > 0
      ? [{ question: `Is there an open-source alternative to ${sourceName}?`, answer: `Open-source options include ${open.map((i) => i.application.name).join(", ")}.` }]
      : []),
  ];

  const list = (title: string, rows: AlternativeItem[]) =>
    rows.length > 0 && (
      <div>
        <h3 className="mb-2 font-semibold">{title}</h3>
        <ul className="flex flex-wrap gap-2">
          {rows.map((i) => (
            <li key={i.application.id}>
              <Link href={`/software/${i.application.slug}`} className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-accent/50">
                {i.application.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section aria-labelledby="alt-intents" className="mt-10 flex flex-col gap-6">
      <JsonLd data={faqJsonLd(faq)} />
      <h2 id="alt-intents" className="text-xl font-semibold">Apps like {sourceName}</h2>
      {list(`Free ${sourceName} alternatives`, free)}
      {list(`Open-source ${sourceName} alternatives`, open)}
      {related.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{sourceName} alternatives by use case</h3>
          <ul className="flex flex-wrap gap-2">
            {related.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-accent/50">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {faq.map((f) => (
          <details key={f.question} className="rounded-lg border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer font-medium">{f.question}</summary>
            <p className="mt-2 text-sm text-muted">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
