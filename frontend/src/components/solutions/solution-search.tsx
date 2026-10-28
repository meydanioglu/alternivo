"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface SolutionLink {
  slug: string;
  title: string;
  category: string;
  description: string;
}

/** Filters the published solution pages by text and category, in the browser. */
export function SolutionSearch({ items, categories }: { items: SolutionLink[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (!category || i.category === category) && (!q || `${i.title} ${i.description}`.toLowerCase().includes(q)));
  }, [items, query, category]);

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search solutions</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your problem, e.g. receive payments in Turkey"
          className="h-11 w-full rounded-[10px] border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categories">
        {[null, ...categories].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-3 py-1 text-xs ${category === c ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border text-muted hover:text-foreground"}`}
          >
            {c ?? "All"}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No published solution matches yet. Try another search or browse <Link href="/best" className="underline">best lists</Link>.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {shown.map((i) => (
            <li key={i.slug}>
              <Link href={`/solutions/${i.slug}`} className="block h-full rounded-[10px] border border-border bg-surface p-4 hover:border-accent">
                <span className="text-xs text-muted">{i.category}</span>
                <span className="mt-1 block font-medium">{i.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-foreground/75">{i.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
