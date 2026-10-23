import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/styles";

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={cx(cls, "hover:border-accent/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Tabs({ items, current }: { items: { value: string; label: string; href: string }[]; current: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-1 border-b border-border">
      {items.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={current === t.value ? "page" : undefined}
          className={cx(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            current === t.value ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-muted">
                Kayıt yok.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(iso));
