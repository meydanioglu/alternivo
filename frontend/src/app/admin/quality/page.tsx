import Link from "next/link";
import { AdminHeader, StatCard, Table, Tabs } from "@/components/admin/admin-parts";
import { chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Issue {
  severity: "error" | "review" | "info";
  type: string;
  slug: string;
  name: string;
  detail: string;
}

interface Report {
  generatedAt: string;
  issueCounts: Record<string, number>;
  issues: Issue[];
  averageScore: number;
  lowestScores: { slug: string; name: string; score: number; missing: string[] }[];
}

interface Metrics {
  publishedApps: number;
  indexableApps: number;
  categories: number;
  indexableCategories: number;
  relationships: number;
  curatedRelationships: number;
  contentPending: number;
  errors: number;
  reviews: number;
  averageScore: number;
  organicVisits: number;
  totalVisits: number;
}

interface Daily {
  day: string;
  today: Metrics;
  yesterday: Metrics | null;
  weekAgo: Metrics | null;
  monthAgo: Metrics | null;
  gainers: { path: string; last7: number; previous7: number; change: number }[];
  losers: { path: string; last7: number; previous7: number; change: number }[];
  tasks: string[];
  note: string;
}

const SEVERITY = { error: { label: "Hata", color: "danger" }, review: { label: "Kontrol", color: "warning" }, info: { label: "Bilgi", color: "default" } } as const;

const TYPE_LABELS: Record<string, string> = {
  "duplicate-domain": "Aynı resmi site",
  "duplicate-name": "Aynı isim",
  "similar-brand": "Benzer marka, farklı site",
  "suffixed-slug": "Sonu -2 olan slug",
  "missing-website": "Web sitesi yok",
  "brand-domain-mismatch": "İsim / alan adı uyuşmuyor",
  "no-primary-category": "Ana kategori yok",
  "placeholder-description": "Yer tutucu açıklama",
  "unknown-pricing": "Fiyat modeli yok",
  "no-platforms": "Platform yok",
  "no-logo": "Logo yok",
  "no-alternatives": "Alternatif yok",
  "only-automatic-alternatives": "Sadece otomatik alternatif",
  "stale-verification": "Doğrulama eski",
  "content-not-approved": "İçerik onaylanmamış",
  "website-unreachable": "Site okunamadı",
  "empty-category": "Boş kategori",
  "thin-category": "Az ürünlü kategori",
};

function Delta({ now, then }: { now: number; then: number | undefined }) {
  if (then === undefined) return <span className="text-muted">—</span>;
  const d = Math.round((now - then) * 10) / 10;
  return <span className={d > 0 ? "text-success" : d < 0 ? "text-danger" : "text-muted"}>{d > 0 ? `+${d}` : d}</span>;
}

type Props = { searchParams: Promise<{ tab?: string; severity?: string; type?: string }> };

export default async function AdminQualityPage({ searchParams }: Props) {
  const { tab = "daily", severity = "", type = "" } = await searchParams;
  const [daily, report] = await Promise.all([
    userApi<Daily>("/api/v1/admin/seo/daily", { persist: false }),
    userApi<Report>("/api/v1/admin/quality", { persist: false }),
  ]);
  const t = daily.today;
  const rows: [string, keyof Metrics][] = [
    ["Yayındaki ürün", "publishedApps"],
    ["İndekslenebilir ürün", "indexableApps"],
    ["İndekslenebilir kategori", "indexableCategories"],
    ["Alternatif ilişkisi", "relationships"],
    ["Editör/topluluk ilişkisi", "curatedRelationships"],
    ["Onay bekleyen içerik", "contentPending"],
    ["Veri hatası", "errors"],
    ["Kontrol gereken kayıt", "reviews"],
    ["Ortalama sayfa skoru", "averageScore"],
    ["Organik ziyaret (dün)", "organicVisits"],
    ["Toplam ziyaret (dün)", "totalVisits"],
  ];
  const issues = report.issues.filter((i) => (!severity || i.severity === severity) && (!type || i.type === type));
  const types = Object.keys(report.issueCounts).filter((k) => k.startsWith("type:")).map((k) => k.slice(5));

  return (
    <>
      <AdminHeader title="SEO & Kalite" description="Günlük SEO raporu, veri kalitesi denetimi ve sayfa kalite skorları. Kayıtlar otomatik değiştirilmez." />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Hata" value={report.issueCounts.error ?? 0} href="/admin/quality?tab=issues&severity=error" />
        <StatCard label="Kontrol" value={report.issueCounts.review ?? 0} href="/admin/quality?tab=issues&severity=review" />
        <StatCard label="Bilgi" value={report.issueCounts.info ?? 0} href="/admin/quality?tab=issues&severity=info" />
        <StatCard label="Ort. sayfa skoru" value={report.averageScore} href="/admin/quality?tab=scores" />
      </div>
      <Tabs
        items={[
          { value: "daily", label: "Günlük rapor", href: "/admin/quality?tab=daily" },
          { value: "issues", label: `Veri kalitesi (${report.issues.length})`, href: "/admin/quality?tab=issues" },
          { value: "scores", label: "En düşük skorlar", href: "/admin/quality?tab=scores" },
        ]}
        current={tab}
      />

      {tab === "daily" && (
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-2 font-semibold">Bugün için en etkili 3 iş</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {daily.tasks.map((task) => <li key={task}>{task}</li>)}
            </ol>
          </section>
          <Table head={["Metrik", "Şimdi", "Dün", "7 gün", "28 gün"]} empty={false}>
            {rows.map(([label, key]) => (
              <tr key={key}>
                <td className="px-4 py-2 text-sm">{label}</td>
                <td className="px-4 py-2 text-sm font-semibold tabular-nums">{t[key]}</td>
                <td className="px-4 py-2 text-sm tabular-nums"><Delta now={t[key]} then={daily.yesterday?.[key]} /></td>
                <td className="px-4 py-2 text-sm tabular-nums"><Delta now={t[key]} then={daily.weekAgo?.[key]} /></td>
                <td className="px-4 py-2 text-sm tabular-nums"><Delta now={t[key]} then={daily.monthAgo?.[key]} /></td>
              </tr>
            ))}
          </Table>
          <div className="grid gap-4 lg:grid-cols-2">
            {[["Organik trafiği artan sayfalar", daily.gainers], ["Organik trafiği düşen sayfalar", daily.losers]].map(([title, list]) => (
              <section key={title as string} className="rounded-xl border border-border bg-surface p-4">
                <h2 className="mb-2 font-semibold">{title as string}</h2>
                {(list as Daily["gainers"]).length === 0 ? (
                  <p className="text-sm text-muted">Henüz yeterli organik veri yok.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {(list as Daily["gainers"]).map((l) => (
                      <li key={l.path} className="flex justify-between gap-2">
                        <a href={l.path} target="_blank" className="truncate text-accent hover:underline">{l.path}</a>
                        <span className="tabular-nums text-muted">{l.previous7} → {l.last7}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="text-xs text-muted">{daily.note} Karşılaştırmalar her gün saklanan anlık görüntülerden hesaplanır; ilk günlerde boş görünmesi normaldir.</p>
        </div>
      )}

      {tab === "issues" && (
        <>
          <nav className="mb-3 flex flex-wrap gap-1.5 text-xs">
            <Link href={`/admin/quality?tab=issues${severity ? `&severity=${severity}` : ""}`} className={chipClass(type ? "default" : "accent", "soft", "sm")}>Tümü</Link>
            {types.map((ty) => (
              <Link key={ty} href={`/admin/quality?tab=issues&type=${ty}${severity ? `&severity=${severity}` : ""}`} className={chipClass(type === ty ? "accent" : "default", "soft", "sm")}>
                {TYPE_LABELS[ty] ?? ty} ({report.issueCounts[`type:${ty}`]})
              </Link>
            ))}
          </nav>
          <Table head={["Önem", "Tür", "Kayıt", "Ayrıntı"]} empty={issues.length === 0}>
            {issues.slice(0, 500).map((i, n) => (
              <tr key={`${i.type}-${i.slug}-${n}`}>
                <td className="px-4 py-2"><span className={chipClass(SEVERITY[i.severity].color, "soft", "sm")}>{SEVERITY[i.severity].label}</span></td>
                <td className="px-4 py-2 text-sm">{TYPE_LABELS[i.type] ?? i.type}</td>
                <td className="px-4 py-2 text-sm">
                  <a href={i.type.includes("category") ? `/category/${i.slug}` : `/software/${i.slug}`} target="_blank" className="font-medium text-accent hover:underline">{i.name}</a>
                </td>
                <td className="px-4 py-2 text-xs text-muted">{i.detail}</td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {tab === "scores" && (
        <Table head={["Ürün", "Skor", "Eksikler"]} empty={report.lowestScores.length === 0}>
          {report.lowestScores.map((s) => (
            <tr key={s.slug}>
              <td className="px-4 py-2 text-sm"><a href={`/software/${s.slug}`} target="_blank" className="text-accent hover:underline">{s.name}</a></td>
              <td className="px-4 py-2 text-sm font-semibold tabular-nums">{s.score}</td>
              <td className="px-4 py-2 text-xs text-muted">{s.missing.join(" · ")}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
