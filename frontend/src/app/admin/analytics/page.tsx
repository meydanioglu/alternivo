import { Monitor, Smartphone, Tablet, UserCheck } from "lucide-react";
import Link from "next/link";
import { AdminHeader, StatCard, dateTime } from "@/components/admin/admin-parts";
import { type Analytics, type Growth, deviceLabel } from "@/components/admin/analytics-types";
import { BarList, TrafficChart } from "@/components/admin/traffic-chart";
import { formatPrice } from "@/lib/auth/integrations";
import { userApi } from "@/lib/auth/session";

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;

const GRAINS = [
  { value: "day", label: "Günlük" },
  { value: "week", label: "Haftalık" },
  { value: "month", label: "Aylık" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

type Props = { searchParams: Promise<{ days?: string; from?: string; to?: string; grain?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = iso(new Date());
  const to = valid(sp.to) ?? today;
  const from = valid(sp.from) ?? daysAgo(Math.max(1, Math.min(730, Number(sp.days) || 30)) - 1);
  const grain = GRAINS.some((g) => g.value === sp.grain) ? sp.grain! : "day";
  const q = `from=${from}&to=${to}`;
  const [a, g] = await Promise.all([
    userApi<Analytics>(`/api/v1/admin/analytics?${q}&grain=${grain}`, { persist: false }),
    userApi<Growth>(`/api/v1/admin/analytics/growth?${q}`, { persist: false }),
  ]);
  const presets = [
    { label: "Bugün", from: today, grain: "day" },
    { label: "7 gün", from: daysAgo(6), grain: "day" },
    { label: "30 gün", from: daysAgo(29), grain: "day" },
    { label: "90 gün", from: daysAgo(89), grain: "week" },
    { label: "12 ay", from: daysAgo(364), grain: "month" },
  ];
  const funnelMax = Math.max(1, ...g.makerFunnel.map((f) => f.count));
  const count = (key: string) => g.makerFunnel.find((f) => f.key === key)?.count ?? 0;
  const input = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  return (
    <>
      <AdminHeader
        title="Ziyaretçiler"
        description="Çerezsiz, anonim ölçüm: IP adresi saklanmaz, tekil ziyaretçi günlük olarak sayılır (haftalık ve aylık değerler günlük tekillerin toplamıdır). Botlar ve yönetim sayfaları hariç."
      />

      <div className="mb-5 flex flex-wrap items-end gap-4 border-b border-border pb-4">
        <form className="flex flex-wrap items-end gap-2" action="/admin/analytics">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Başlangıç
            <input type="date" name="from" defaultValue={from} max={today} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Bitiş
            <input type="date" name="to" defaultValue={to} max={today} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Gruplama
            <select name="grain" defaultValue={grain} className={input}>
              {GRAINS.map((x) => (
                <option key={x.value} value={x.value}>{x.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground">Uygula</button>
        </form>
        <nav className="flex flex-wrap gap-1 text-sm" aria-label="Hazır aralıklar">
          {presets.map((p) => {
            const active = p.from === from && to === today && p.grain === grain;
            return (
              <Link
                key={p.label}
                href={`/admin/analytics?from=${p.from}&to=${today}&grain=${p.grain}`}
                aria-current={active ? "page" : undefined}
                className={active ? "rounded-md bg-surface-secondary px-2.5 py-1.5 font-medium" : "rounded-md px-2.5 py-1.5 text-muted hover:text-foreground"}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Şu an sitede" value={a.activeNow} hint="son 5 dakika" />
        <StatCard label="Aralığın son günü" value={a.visitorsToday} hint={`${a.viewsToday} görüntüleme`} />
        <StatCard label={`${a.days} gün ziyaret`} value={a.visitors.toLocaleString("tr-TR")} />
        <StatCard
          label={`${a.days} gün görüntüleme`}
          value={a.views.toLocaleString("tr-TR")}
          hint={a.visitors ? `kişi başı ${(a.views / a.visitors).toFixed(1)} sayfa` : undefined}
        />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">{GRAINS.find((x) => x.value === a.grain)?.label ?? "Günlük"} trafik</h2>
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

      {a.campaigns && a.campaigns.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Kampanyalar (UTM)</h2>
          <BarList rows={a.campaigns} total={a.views} emptyText="UTM etiketli ziyaret yok." />
        </section>
      )}

      <h2 className="mb-1 mt-10 text-lg font-semibold">Maker hunisi</h2>
      <p className="mb-4 text-sm text-muted">
        Seçili aralıkta pricing’den ödemeye yolculuk. Ziyaretçi adımları günlük tekil ziyaretçi, sipariş adımları sipariş sayısıdır.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pricing’e gelip ödemeye geçmeyen" value={g.pricingWithoutCheckout} hint="aynı gün ödeme sayfasına ulaşmadı" />
        <StatCard label="Ödeme başlatıp tamamlamayan" value={g.checkoutWithoutPayment} hint="başarısız, yarıda kalan veya açık" />
        <StatCard label="Ürün gönderen" value={count("submitted")} />
        <StatCard label="Ödeme tamamlanan" value={count("paid")} />
      </div>
      <section className="mt-4 rounded-xl border border-border bg-surface p-5">
        <ol className="flex flex-col gap-2 text-sm">
          {g.makerFunnel.map((f) => (
            <li key={f.key} className="grid grid-cols-[minmax(9rem,14rem)_1fr_3rem] items-center gap-3">
              <span className="text-muted">{f.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                <span
                  className={`block h-full rounded-full ${f.key === "failed" || f.key === "abandoned" ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${(f.count / funnelMax) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{f.count}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Plan bazında siparişler</h2>
          {g.plans.length === 0 ? (
            <p className="py-4 text-sm text-muted">Bu aralıkta sipariş yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1 font-medium">Plan</th>
                    <th className="font-medium">Başlatılan</th>
                    <th className="font-medium">Onay</th>
                    <th className="font-medium">Ödenen</th>
                    <th className="font-medium">Başarısız</th>
                    <th className="font-medium">Yarıda</th>
                    <th className="font-medium">İade</th>
                    <th className="font-medium">Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {g.plans.map((p) => (
                    <tr key={p.planKey}>
                      <td className="py-1.5 font-medium">{p.planKey}</td>
                      <td>{p.created}</td>
                      <td>{p.termsAccepted}</td>
                      <td className="text-success">{p.paid}</td>
                      <td className="text-danger">{p.failed}</td>
                      <td>{p.abandoned}</td>
                      <td>{p.refunded}</td>
                      <td>{formatPrice(p.revenueMinor, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {g.failureReasons.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Başarısız ödeme nedenleri</h3>
              <BarList rows={g.failureReasons} total={g.failureReasons.reduce((n, r) => n + r.count, 0)} emptyText="" />
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 font-semibold">Ürün gönderenler nereden geldi</h2>
          <p className="mb-3 text-xs text-muted">
            Gönderen kullanıcının, göndermeden önceki ziyaretlerindeki ilk dış kaynak (referrer veya UTM). Çerez kullanılmaz; aynı gün
            içindeki yolculuk izlenebilir, önceki günlere uzanan ilk temas görünmeyebilir.
          </p>
          <BarList rows={g.submissionSources} total={g.submissionSources.reduce((n, r) => n + r.count, 0)} emptyText="Bu aralıkta gönderim yok." />
          {g.recentSubmissions.length > 0 && (
            <ul className="mt-4 divide-y divide-border text-sm">
              {g.recentSubmissions.map((s) => (
                <li key={s.submissionId} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                  <Link href={`/admin/submissions/${s.submissionId}`} className="font-medium hover:underline">{s.name}</Link>
                  <span className="text-xs text-muted">{s.status}</span>
                  <span className="ml-auto text-xs">{s.source}{s.landingPath ? ` → ${s.landingPath}` : ""}</span>
                  <span className="text-xs tabular-nums text-muted">{dateTime(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
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
