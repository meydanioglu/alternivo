import type { Analytics } from "./analytics-types";

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));

/** Daily views (bar) and unique visitors (inner bar). Plain CSS, no chart library. */
export function TrafficChart({ daily }: { daily: Analytics["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <div>
      <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Günlük sayfa görüntüleme grafiği">
        {daily.map((d) => (
          <div key={d.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="relative w-full rounded-t bg-accent/25" style={{ height: `${(d.views / max) * 100}%` }}>
              <div className="absolute inset-x-0 bottom-0 rounded-t bg-accent" style={{ height: d.views ? `${(d.visitors / d.views) * 100}%` : 0 }} />
            </div>
            <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs shadow group-hover:block">
              <p className="font-semibold">{dayLabel(d.date)}</p>
              {d.views} görüntüleme · {d.visitors} ziyaretçi
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{daily[0] && dayLabel(daily[0].date)}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-accent/25" /> Görüntüleme
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-accent" /> Tekil ziyaretçi
          </span>
        </span>
        <span>{daily.at(-1) && dayLabel(daily.at(-1)!.date)}</span>
      </div>
    </div>
  );
}

export function BarList({ rows, total, emptyText }: { rows: { key: string; count: number }[]; total: number; emptyText: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.key} className="relative overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
          <span className="absolute inset-y-0 left-0 bg-accent/10" style={{ width: `${(r.count / max) * 100}%` }} aria-hidden="true" />
          <span className="relative flex justify-between gap-3">
            <span className="truncate">{r.key}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {r.count} <span className="text-xs">({total ? Math.round((r.count / total) * 100) : 0}%)</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
