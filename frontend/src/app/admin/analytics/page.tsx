import { Monitor, Smartphone, Tablet, UserCheck } from "lucide-react";
import Link from "next/link";
import { AdminHeader, StatCard, Tabs, dateTime } from "@/components/admin/admin-parts";
import { type Analytics, deviceLabel } from "@/components/admin/analytics-types";
import { BarList, TrafficChart } from "@/components/admin/traffic-chart";
import { userApi } from "@/lib/auth/session";

const RANGES = [
  { value: "7", label: "7 gün" },
  { value: "30", label: "30 gün" },
  { value: "90", label: "90 gün" },
];

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;

type Props = { searchParams: Promise<{ days?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const { days = "30" } = await searchParams;
  const range = RANGES.some((r) => r.value === days) ? days : "30";
  const a = await userApi<Analytics>(`/api/v1/admin/analytics?days=${range}`, { persist: false });

  return (
    <>
      <AdminHeader
        title="Ziyaretçiler"
        description="Çerezsiz, anonim ölçüm: IP adresi saklanmaz, tekil ziyaretçi günlük olarak sayılır. Botlar ve yönetim sayfaları hariç."
      />
      <Tabs items={RANGES.map((r) => ({ ...r, href: `/admin/analytics?days=${r.value}` }))} current={range} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Şu an sitede" value={a.activeNow} hint="son 5 dakika" />
        <StatCard label="Bugün" value={a.visitorsToday} hint={`${a.viewsToday} görüntüleme`} />
        <StatCard label={`${a.days} gün ziyaretçi`} value={a.visitors.toLocaleString("tr-TR")} />
        <StatCard label={`${a.days} gün görüntüleme`} value={a.views.toLocaleString("tr-TR")} hint={a.visitors ? `kişi başı ${(a.views / a.visitors).toFixed(1)} sayfa` : undefined} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Günlük trafik</h2>
        <TrafficChart daily={a.daily} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">En çok ziyaret edilen sayfalar</h2>
          <BarList rows={a.topPages} total={a.views} emptyText="Henüz veri yok." />
        </section>
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">Nereden geliyorlar</h2>
            <BarList rows={a.topReferrers} total={a.views} emptyText="Dış kaynaktan gelen ziyaret yok (doğrudan giriş)." />
          </section>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">Cihazlar</h2>
            <BarList rows={a.devices.map((d) => ({ key: deviceLabel(d.key), count: d.count }))} total={a.views} emptyText="Henüz veri yok." />
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Son ziyaretler (canlı)</h2>
        {a.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Henüz ziyaret yok.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {a.recent.map((r, i) => {
              const Icon = DEVICE_ICON[r.device as keyof typeof DEVICE_ICON] ?? Monitor;
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <Icon className="size-4 shrink-0 text-muted" aria-label={deviceLabel(r.device)} />
                  <Link href={r.path} target="_blank" className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {r.path}
                  </Link>
                  {r.signedIn && (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <UserCheck className="size-3.5" aria-hidden="true" /> üye
                    </span>
                  )}
                  {r.referrerHost && <span className="text-xs text-muted">← {r.referrerHost}</span>}
                  <span className="text-xs tabular-nums text-muted">{dateTime(r.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
