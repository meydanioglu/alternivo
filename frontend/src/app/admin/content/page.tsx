import { CircleAlert, KeyRound, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { cancelQueuedContentAction, queueContentAction, retryFailedContentAction } from "@/app/admin/content/actions";
import { AdminHeader, StatCard, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { AutoRefresh } from "@/components/admin/import-form";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { Pagination } from "@/components/layout/page-parts";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  applicationId: string;
  applicationName: string;
  applicationSlug: string;
  logoUrl: string | null;
  applicationStatus: string;
  status: "Queued" | "Generating" | "Ready" | "Approved" | "Rejected" | "Failed";
  shortDescription: string | null;
  sourceChars: number;
  error: string | null;
  updatedAt: string;
}

interface Overview {
  counts: Record<string, number>;
  items: { items: Row[]; page: number; pageSize: number; totalCount: number };
  inputTokens: number;
  outputTokens: number;
}

const STATUS = {
  Queued: { label: "Sırada", color: "default" },
  Generating: { label: "Yazılıyor", color: "accent" },
  Ready: { label: "Onay bekliyor", color: "warning" },
  Approved: { label: "Onaylandı", color: "success" },
  Rejected: { label: "Reddedildi", color: "default" },
  Failed: { label: "Hata", color: "danger" },
} as const;

const TABS = [
  { value: "ready", label: "Onay bekleyen" },
  { value: "", label: "Tümü" },
  { value: "queued", label: "Sırada" },
  { value: "approved", label: "Onaylanan" },
  { value: "failed", label: "Hata" },
  { value: "rejected", label: "Reddedilen" },
];

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string; approved?: string }> };

export default async function AdminContentPage({ searchParams }: Props) {
  const { status = "ready", q = "", page = "1", approved } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  const [data, cfg] = await Promise.all([
    userApi<Overview>(`/api/v1/admin/content?${qs}`, { persist: false }),
    userApi<{ configured: boolean; model: string }>("/api/v1/admin/content/status", { persist: false }),
  ]);
  const c = data.counts;
  const busy = (c.queued ?? 0) + (c.generating ?? 0) > 0;
  const totalPages = Math.max(1, Math.ceil(data.items.totalCount / data.items.pageSize));
  const href = (p: number, s = status) => `/admin/content?${new URLSearchParams({ ...(s ? { status: s } : { status: "" }), ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <AutoRefresh active={busy && cfg.configured} seconds={8} />
      <AdminHeader
        title="İçerik"
        description="Her ürün için kendi web sitesindeki bilgilere dayanan SEO içeriği yazılır ve taslak olarak bekler. Siz okuyup düzenleyip onaylayınca ürün sayfasına geçer."
      />

      {!cfg.configured && (
        <div className="mb-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="font-semibold">OpenAI API anahtarı tanımlı değil.</p>
            <p className="mt-1 text-foreground/80">
              <Link href="/admin/settings" className="font-medium text-accent hover:underline">
                Ayarlar
              </Link>{" "}
              sayfasından OpenAI API anahtarınızı ekleyin. Kuyruğa eklenenler anahtar tanımlanınca kendiliğinden işlenmeye başlar.
            </p>
          </div>
        </div>
      )}
      {approved && (
        <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          İçerik onaylandı ve ürün sayfasına uygulandı.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Onay bekleyen" value={c.ready ?? 0} href="/admin/content?status=ready" />
        <StatCard
          label="Sırada / yazılıyor"
          value={busy ? <span className="inline-flex items-center gap-2">{(c.queued ?? 0) + (c.generating ?? 0)}{cfg.configured && <Loader2 className="size-4 animate-spin text-accent" />}</span> : 0}
        />
        <StatCard label="Onaylanan" value={c.approved ?? 0} />
        <StatCard label="Hata" value={c.failed ?? 0} />
        <StatCard label="Kullanılan token" value={`${Math.round((data.inputTokens + data.outputTokens) / 1000)}K`} hint={`model: ${cfg.model}`} />
      </div>

      <section className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4">
        <ActionButton action={queueContentAction.bind(null, "missing")} variant="primary" confirm="Onaylı içeriği olmayan tüm ürünler için içerik üretilsin mi? (OpenAI hesabınızdan ücretlendirilir.)">
          İçeriği olmayanlar için üret
        </ActionButton>
        <ActionButton action={queueContentAction.bind(null, "all")} confirm="TÜM ürünler için yeniden içerik üretilsin mi? Onaylı içerikler siz yeni taslağı onaylayana kadar değişmez.">
          Hepsini yeniden üret
        </ActionButton>
        <ActionButton action={retryFailedContentAction}>Hatalıları tekrar dene</ActionButton>
        <ActionButton action={cancelQueuedContentAction} variant="ghost" confirm="Sıradaki (henüz başlamamış) işler iptal edilsin mi?">
          Sıradakileri iptal et
        </ActionButton>
        <form action="/admin/content" className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Ürün ara…" className="w-48 rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-accent" />
          </div>
        </form>
      </section>

      <div className="mt-6">
        <Tabs items={TABS.map((t) => ({ ...t, href: href(1, t.value) }))} current={status} />
        <Table head={["Ürün", "Durum", "Taslak", "Güncellendi", ""]} empty={data.items.items.length === 0}>
          {data.items.items.map((r) => {
            const s = STATUS[r.status];
            return (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ApplicationLogo name={r.applicationName} logoUrl={r.logoUrl} size="sm" />
                    <div>
                      <p className="font-medium">{r.applicationName}</p>
                      <p className="text-xs text-muted">{r.applicationStatus === "Published" ? "Yayında" : "Taslak ürün"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={chipClass(s.color, "soft", "sm")}>{s.label}</span>
                </td>
                <td className="max-w-md px-4 py-3 text-xs text-muted">
                  {r.error ? (
                    <span className="inline-flex items-start gap-1 text-warning">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {r.error}
                    </span>
                  ) : (
                    <span className="line-clamp-2">{r.shortDescription ?? "—"}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(r.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  {(r.status === "Ready" || r.status === "Approved" || r.status === "Rejected") && (
                    <Link href={`/admin/content/${r.id}`} className={buttonClass(r.status === "Ready" ? "primary" : "outline", "sm")}>
                      {r.status === "Ready" ? "İncele" : "Aç"}
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={data.items.page} totalPages={totalPages} hrefFor={(p) => href(p)} />
      </div>
    </>
  );
}
