"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";

export function SortSelector({ options, defaultValue }: { options: readonly { value: string; label: string }[]; defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();
  const current = searchParams.get("sort") ?? defaultValue;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">
        Sort by
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === defaultValue) params.delete("sort");
          else params.set("sort", e.target.value);
          params.delete("page");
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
        className="h-9 cursor-pointer rounded-md border border-border bg-field px-2 text-sm text-field-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
