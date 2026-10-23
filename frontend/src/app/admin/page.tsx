import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { AdminHeader, StatCard } from "@/components/admin/admin-parts";
import type { Analytics, Dashboard } from "@/components/admin/analytics-types";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { buttonClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

export default async function AdminHomePage() {
  const [dash, stats] = await Promise.all([
    userApi<Dashboard>("/api/v1/admin/dashboard", { persist: false }),
    userApi<Analytics>("/api/v1/admin/analytics?days=14", { persist: false }).catch(() => null),
  ]);

  const todo = [
    { label: "Bekleyen ürün gönderimi", count: dash.pendingSubmissions, href: "/admin/submissions" },
    { label: "Bekleyen alternatif önerisi", count: dash.pendingAlternatives, href: "/admin/alternatives" },
    { label: "Açık şikayet", count: dash.openReports, href: "/admin/reports" },
  ];

  return (
    <>
      <AdminHeader
        title="Genel bakış"
        description="Sitenin durumu ve bekleyen işler."
        action={
          <Link href="/admin/apps/new" className={buttonClass("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Uygulama ekle
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Şu an sitede" value={stats?.activeNow ?? 0} hint="son 5 dakika" href="/admin/analytics" />
        <StatCard label="Bugün ziyaretçi" value={stats?.visitorsToday ?? 0} hint={`${stats?.viewsToday ?? 0} görüntüleme`} href="/admin/analytics" />
        <StatCard label="Yayındaki uygulama" value={dash.publishedApplications} hint={`${dash.draftApplications} taslak`} href="/admin/apps" />
        <StatCard label="Yorum" value={dash.reviews} href="/admin/reviews" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Son 14 gün</h2>
            <Link href="/admin/analytics" className="text-sm text-accent hover:underline">
              Detaylı istatistik
            </Link>
          </div>
          {stats ? <TrafficChart daily={stats.daily} /> : <p className="text-sm text-muted">İstatistik yüklenemedi.</p>}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Bekleyen işler</h2>
          <ul className="flex flex-col gap-2">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:border-accent/50">
                  <span>{t.label}</span>
                  <span className="flex items-center gap-2">
                    <span className={t.count > 0 ? "rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning" : "text-xs text-muted"}>
                      {t.count}
                    </span>
                    <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
