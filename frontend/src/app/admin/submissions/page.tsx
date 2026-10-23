import { CircleAlert, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { AdminHeader, StatCard, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { Pagination } from "@/components/layout/page-parts";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Item {
  submission: {
    id: string;
    name: string;
    websiteUrl: string;
    description: string;
    categorySlug: string | null;
    status: "Pending" | "Approved" | "Rejected" | "NeedsChanges";
    possibleDuplicateApplicationId: string | null;
    createdAt: string;
  };
  submitter: { email: string; displayName: string | null; handle: string | null } | null;
}

interface Review {
  counts: Record<string, number>;
  page: number;
  pageSize: number;
  totalCount: number;
  items: Item[];
}

const STATUS = {
  Pending: { label: "Onay bekliyor", color: "warning" },
  NeedsChanges: { label: "Değişiklik istendi", color: "default" },
  Approved: { label: "Onaylandı", color: "success" },
  Rejected: { label: "Reddedildi", color: "danger" },
} as const;

const DONE: Record<string, string> = {
  approve: "Ürün onaylandı ve yayına alındı. Yapay zekâ içerik taslağı İçerik sayfasında onayınızı bekleyecek.",
  "needs-changes": "Gönderene değişiklik istendiği bildirildi; hesabındaki gönderim listesinde notunuzu görecek.",
  reject: "Gönderim reddedildi.",
};

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string; done?: string }> };

export default async function AdminSubmissionsPage({ searchParams }: Props) {
  const { status = "pending", q = "", page = "1", done } = await searchParams;
  const qs = new URLSearchParams({ page, status });
  if (q) qs.set("q", q);
  const data = await userApi<Review>(`/api/v1/admin/submissions/review?${qs}`, { persist: false });
  const c = data.counts;
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const href = (p: number, s = status) => `/admin/submissions?${new URLSearchParams({ status: s, ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  const tabs = [
    { value: "pending", label: `Onay bekleyen (${c.pending ?? 0})` },
    { value: "needschanges", label: `Değişiklik istendi (${c.needschanges ?? 0})` },
    { value: "approved", label: `Onaylanan (${c.approved ?? 0})` },
    { value: "rejected", label: `Reddedilen (${c.rejected ?? 0})` },
    { value: "", label: "Tümü" },
  ];

  return (
    <>
      <AdminHeader
        title="Ürün gönderimleri"
        description="Üyelerin gönderdiği ürünler. Açılışa özel gönderim ücretsiz; hiçbir ürün sizin onayınız olmadan yayına girmez."
      />
      {done && DONE[done] && (
        <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {DONE[done]}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Onay bekleyen" value={c.pending ?? 0} href="/admin/submissions?status=pending" />
        <StatCard label="Değişiklik istendi" value={c.needschanges ?? 0} href="/admin/submissions?status=needschanges" />
        <StatCard label="Onaylanan" value={c.approved ?? 0} href="/admin/submissions?status=approved" />
        <StatCard label="Reddedilen" value={c.rejected ?? 0} href="/admin/submissions?status=rejected" />
      </div>

      <form action="/admin/submissions" className="mb-4 flex gap-2">
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Ürün adı veya web sitesi ile ara…" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" />
        </div>
        <button className={buttonClass("outline", "md")}>Ara</button>
      </form>

      <Tabs items={tabs.map((t) => ({ ...t, href: href(1, t.value) }))} current={status} />
      <Table head={["Ürün", "Gönderen", "Durum", "Tarih", ""]} empty={data.items.length === 0}>
        {data.items.map(({ submission: s, submitter }) => {
          const st = STATUS[s.status] ?? { label: s.status, color: "default" as const };
          return (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/submissions/${s.id}`} className="font-semibold hover:underline">
                  {s.name}
                </Link>
                <a href={s.websiteUrl} target="_blank" rel="noopener nofollow" className="flex items-center gap-1 truncate text-xs text-muted hover:text-foreground">
                  {s.websiteUrl.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" aria-hidden="true" />
                </a>
                {s.possibleDuplicateApplicationId && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                    <CircleAlert className="size-3.5" aria-hidden="true" /> Katalogda benzeri olabilir
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {submitter ? (
                  <>
                    <p>{submitter.displayName ?? "—"}</p>
                    <p className="text-xs text-muted">{submitter.email}</p>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={chipClass(st.color, "soft", "sm")}>{st.label}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(s.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/submissions/${s.id}`} className={buttonClass(s.status === "Pending" ? "primary" : "outline", "sm")}>
                  {s.status === "Pending" ? "İncele" : "Aç"}
                </Link>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={data.page} totalPages={totalPages} hrefFor={(p) => href(p)} />
    </>
  );
}
