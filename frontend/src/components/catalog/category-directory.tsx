"use client";

import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/components/ui/styles";

export interface DirectoryCategory {
  slug: string;
  name: string;
  count: number;
}

/** Searchable grid of every category, including ones with no apps yet. */
export function CategoryDirectory({ categories, onNavigate, autoFocus, compact }: {
  categories: DirectoryCategory[];
  onNavigate?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
    return [...list].sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || a.name.localeCompare(b.name));
  }, [categories, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${categories.length} categories…`}
          aria-label="Search categories"
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No category matches “{query}”.</p>
      ) : (
        <ul className={cx("grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4", compact && "max-h-[60vh] overflow-y-auto pr-1")}>
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                onClick={onNavigate}
                className={cx(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-secondary/60",
                  c.count === 0 && "text-muted",
                )}
              >
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-xs tabular-nums text-muted">{c.count > 0 ? c.count : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Header mega menu: "Categories" button that opens the searchable directory. */
export function CategoriesMenu({ categories }: { categories: DirectoryCategory[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        Categories <ChevronDown className={cx("size-4 transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Categories"
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Browse categories</p>
              <Link href="/categories" onClick={() => setOpen(false)} className="text-sm font-medium text-accent hover:underline">
                View all categories
              </Link>
            </div>
            <CategoryDirectory categories={categories} onNavigate={() => setOpen(false)} autoFocus compact />
          </div>
        </div>
      )}
    </div>
  );
}
