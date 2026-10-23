"use client";

import { Button } from "@heroui/react";
import { ArrowRightLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/lib/api/types";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { cx } from "@/components/ui/styles";

type Picked = { slug: string; name: string };

function AppPicker({ label, value, onChange, exclude }: { label: string; value: Picked | null; onChange: (v: Picked | null) => void; exclude?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/bff/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const data = (await res.json()) as Suggestion[];
          setItems(data.filter((s) => s.type === "application" && s.slug !== exclude));
          setActive(-1);
        }
      } catch {
        // Aborted or offline: keep previous suggestions.
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, exclude]);

  const pick = (s: Suggestion) => {
    onChange({ slug: s.slug, name: s.name });
    setQuery("");
    setItems([]);
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex h-12 items-center gap-3 rounded-lg border border-border bg-surface px-3">
        <ApplicationLogo name={value.name} size="sm" />
        <span className="flex-1 truncate font-medium">{value.name}</span>
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Remove ${value.name}`} onPress={() => onChange(null)}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        autoComplete="off"
        placeholder={label}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (items.length ? (i + 1) % items.length : -1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (items.length ? (i - 1 + items.length) % items.length : -1));
          } else if (e.key === "Enter" && items[active]) {
            e.preventDefault();
            pick(items[active]);
          }
        }}
        className="h-12 w-full rounded-lg border border-border bg-field px-3 text-field-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      {open && items.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-40 mt-1 w-full rounded-lg border border-border bg-overlay p-1 shadow-lg">
          {items.map((s, i) => (
            <li
              key={s.slug}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={cx("flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm", i === active && "bg-surface-secondary")}
            >
              <ApplicationLogo name={s.name} logoUrl={s.logoUrl} size="sm" />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CompareBuilder() {
  const router = useRouter();
  const [a, setA] = useState<Picked | null>(null);
  const [b, setB] = useState<Picked | null>(null);
  const canonical = a && b ? [a.slug, b.slug].sort().join("-vs-") : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
        <AppPicker label="First app, e.g. Notion" value={a} onChange={setA} exclude={b?.slug} />
        <ArrowRightLeft className="mx-auto hidden size-5 text-muted md:block" aria-hidden="true" />
        <AppPicker label="Second app, e.g. Obsidian" value={b} onChange={setB} exclude={a?.slug} />
        <Button isDisabled={!canonical} onPress={() => canonical && router.push(`/compare/${canonical}`)}>
          Compare
        </Button>
      </div>
    </div>
  );
}
