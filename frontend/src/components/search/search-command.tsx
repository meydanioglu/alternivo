"use client";

import { Clock, Folder, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Suggestion } from "@/lib/api/types";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { cx } from "@/components/ui/styles";

const RECENT_KEY = "recent-searches:v1";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const next = [query, ...readRecent().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): recent searches are a convenience only.
  }
}

type Option = { key: string; href: string; label: string; subtitle: string | null; kind: "application" | "category" | "recent"; logoUrl?: string | null };

/**
 * Accessible search combobox with debounced autocomplete, cancellation of stale requests,
 * keyboard navigation and locally stored recent searches.
 */
export function SearchCommand({
  size = "md",
  placeholder = "Search software, e.g. Photoshop",
  shortcut = false,
  className,
}: {
  size?: "md" | "lg";
  placeholder?: string;
  shortcut?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/bff/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          setSuggestions((await res.json()) as Suggestion[]);
          setActive(-1);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const trimmed = query.trim();
  const options: Option[] =
    trimmed.length >= 2
      ? suggestions.map((s) => ({
          key: `${s.type}:${s.slug}`,
          href: s.type === "application" ? `/software/${s.slug}` : `/category/${s.slug}`,
          label: s.name,
          subtitle: s.subtitle,
          kind: s.type,
          logoUrl: s.logoUrl,
        }))
      : recent.map((q) => ({ key: `recent:${q}`, href: `/search?q=${encodeURIComponent(q)}`, label: q, subtitle: null, kind: "recent" }));

  const go = useCallback(
    (href: string, remember?: string) => {
      if (remember) saveRecent(remember);
      setOpen(false);
      setActive(-1);
      inputRef.current?.blur();
      router.push(href);
    },
    [router],
  );

  const submit = () => {
    if (active >= 0 && options[active]) {
      go(options[active].href, options[active].kind === "recent" ? options[active].label : trimmed || undefined);
    } else if (trimmed) {
      go(`/search?q=${encodeURIComponent(trimmed)}`, trimmed);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length === 0 ? -1 : (i + 1) % options.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length === 0 ? -1 : (i - 1 + options.length) % options.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && (options.length > 0 || (trimmed.length >= 2 && !loading));

  return (
    <div className={cx("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search software
        </label>
        <Search
          className={cx("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "size-5" : "size-4")}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cx(
            "w-full rounded-lg border border-border bg-field text-field-foreground placeholder:text-field-placeholder",
            "outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/30",
            size === "lg" ? "h-14 pl-11 pr-4 text-base shadow-sm" : "h-10 pl-9 pr-10 text-sm",
          )}
        />
        {shortcut && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted md:block">
            /
          </kbd>
        )}
      </form>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label={trimmed.length >= 2 ? "Search suggestions" : "Recent searches"}
          className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-border bg-overlay p-1 text-overlay-foreground shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted" role="presentation">
              No matches. Press Enter to search all results.
            </li>
          ) : (
            options.map((option, i) => (
              <li
                key={option.key}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(option.href, option.kind === "recent" ? option.label : trimmed || undefined)}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm",
                  i === active && "bg-surface-secondary",
                )}
              >
                {option.kind === "application" ? (
                  <ApplicationLogo name={option.label} logoUrl={option.logoUrl} size="sm" />
                ) : option.kind === "category" ? (
                  <Folder className="size-4 text-muted" aria-hidden="true" />
                ) : (
                  <Clock className="size-4 text-muted" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.subtitle && <span className="shrink-0 text-xs text-muted">{option.subtitle}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
