import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { deleteImportAction, publishDraftsAction, requeueAction, requeueOneAction } from "@/app/admin/imports/actions";
import { AdminHeader, StatCard, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { AutoRefresh, ImportForm } from "@/components/admin/import-form";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { Pagination } from "@/components/layout/page-parts";
import { chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  url: string;
  name: string | null;
  categorySlug: string | null;
  status: "Queued" | "Running" | "Done" | "Failed" | "Skipped";
  error: string | null;
  attempts: number;
  applicationId: string | null;
  applicationSlug: string | null;
  applicationStatus: string | null;
  logoUrl: string | null;
  updatedAt: string;
  lastSyncedAt: string | null;
}

interface Overview {
  counts: Record<string, number>;
  items: { items: Row[]; page: number; pageSize: number; totalCount: number };
}

const STATUS = {
  Queued: { label: "Sırada", color: "default" },
  Running: { label: "Çekiliyor", color: "accent" },
  Done: { label: "Tamam", color: "success" },
  Failed: { label: "Hata", color: "danger" },
  Skipped: { label: "Atlandı", color: "warning" },
} as const;

const TABS = [
  { value: "", label: "Tümü" },
  { value: "queued", label: "Sırada" },
  { value: "running", label: "Çekiliyor" },
  { value: "done", label: "Tamam" },
  { value: "failed", label: "Hata" },
];

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function AdminImportsPage({ searchParams }: Props) {
  const { status = "", page = "1" } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (status) qs.set("status", status);
  const [data, categories] = await Promise.all([
    userApi<Overview>(`/api/v1/admin/imports?${qs}`, { persist: false }),
    userApi<{ slug: string; name: string }[]>("/api/v1/admin/categories", { persist: false }),
  ]);
  const c = data.counts;
  const busy = (c.queued ?? 0) + (c.running ?? 0) > 0;
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const totalPages = Math.max(1, Math.ceil(data.items.totalCount / data.items.pageSize));

  return (
    <>
      <AutoRefresh active={busy} />
      <AdminHeader
        title="İçe aktarma ve senkron"
        description="Ürün bilgileri ve logolar her ürünün kendi resmi sitesinden çekilir, görseller sunucumuza kaydedilir. Ürünler taslak olarak oluşur; kontrol edip yayınlayın."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Toplam" value={total} />
        <StatCard label="Sırada" value={c.queued ?? 0} />
        <StatCard label="Çekiliyor" value={busy ? <span className="inline-flex items-center gap-2">{c.running ?? 0}<Loader2 className="size-4 animate-spin text-accent" /></span> : 0} />
        <StatCard label="Tamam" value={c.done ?? 0} />
        <StatCard label="Hata" value={c.failed ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <ImportForm categories={categories.map((x) => ({ slug: x.slug, name: x.name }))} />
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Toplu işlemler</h2>
          <ActionButton action={publishDraftsAction} variant="primary" confirm="İçe aktarılan tüm taslaklar yayınlansın mı?">
            Taslakların hepsini yayınla
          </ActionButton>
          <ActionButton action={requeueAction.bind(null, "failed")}>Hatalıları tekrar dene</ActionButton>
          <ActionButton action={requeueAction.bind(null, "all")} confirm="Tüm ürünler sitelerinden yeniden çekilsin mi? (Doğrulanmış ürünlerin metni değişmez, sadece görseller yenilenir.)">
            Hepsini yeniden senkronla
          </ActionButton>
          <p className="text-xs text-muted">
            Senkron: logo ve kapak görseli yenilenir; editörün doğruladığı ürünlerde açıklama korunur.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Tabs items={TABS.map((t) => ({ ...t, href: t.value ? `/admin/imports?status=${t.value}` : "/admin/imports" }))} current={status} />
        <Table head={["Ürün", "Durum", "Not", "Güncellendi", ""]} empty={data.items.items.length === 0}>
          {data.items.items.map((r) => {
            const s = STATUS[r.status];
            return (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ApplicationLogo name={r.name ?? r.url} logoUrl={r.logoUrl} size="sm" />
                    <div className="min-w-0">
                      {r.applicationId ? (
                        <Link href={`/admin/apps/${r.applicationId}`} className="font-medium hover:underline">
                          {r.name ?? r.applicationSlug}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.name ?? "—"}</span>
                      )}
                      <a href={r.url} target="_blank" rel="noopener nofollow" className="flex items-center gap-1 truncate text-xs text-muted hover:text-foreground">
                        {r.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={chipClass(s.color, "soft", "sm")}>{s.label}</span>
                  {r.applicationStatus && <p className="mt-1 text-xs text-muted">{r.applicationStatus === "Published" ? "Yayında" : "Taslak"}</p>}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-muted">{r.error ?? (r.categorySlug ? `Kategori: ${r.categorySlug}` : "—")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(r.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {r.status !== "Running" && r.status !== "Queued" && (
                      <ActionButton action={requeueOneAction.bind(null, r.id)} variant="ghost">
                        {r.status === "Failed" ? "Tekrar dene" : "Senkronla"}
                      </ActionButton>
                    )}
                    {r.status !== "Running" && (
                      <ActionButton action={deleteImportAction.bind(null, r.id)} variant="ghost" className="text-danger" confirm="Bu kayıt listeden silinsin mi? (Oluşan uygulama silinmez.)">
                        Sil
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={data.items.page}
          totalPages={totalPages}
          hrefFor={(p) => `/admin/imports?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`}
        />
      </div>
    </>
  );
}
