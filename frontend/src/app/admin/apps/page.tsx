import { ExternalLink, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { setApplicationStatusAction } from "@/app/admin/actions";
import { AdminHeader, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { Pagination } from "@/components/layout/page-parts";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  slug: string;
  name: string;
  status: "Draft" | "Published" | "Archived";
  verification: string;
  likeCount: number;
  reviewCount: number;
  updatedAt: string;
}

const STATUS = [
  { value: "", label: "Tümü" },
  { value: "published", label: "Yayında" },
  { value: "draft", label: "Taslak" },
  { value: "archived", label: "Arşiv" },
];

const STATUS_CHIP = {
  Published: { label: "Yayında", color: "success" },
  Draft: { label: "Taslak", color: "warning" },
  Archived: { label: "Arşiv", color: "default" },
} as const;

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

export default async function AdminAppsPage({ searchParams }: Props) {
  const { q = "", status = "", page = "1" } = await searchParams;
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);
  qs.set("page", page);
  const data = await userApi<{ items: Row[]; page: number; totalCount: number; pageSize: number }>(
    `/api/v1/admin/applications?${qs}`,
    { persist: false },
  );
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const href = (p: number, s = status) => {
    const x = new URLSearchParams();
    if (q) x.set("q", q);
    if (s) x.set("status", s);
    if (p > 1) x.set("page", String(p));
    return `/admin/apps${x.size ? `?${x}` : ""}`;
  };

  return (
    <>
      <AdminHeader
        title="Uygulamalar"
        description={`${data.totalCount} kayıt`}
        action={
          <Link href="/admin/apps/new" className={buttonClass("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Uygulama ekle
          </Link>
        }
      />
      <form className="mb-4 flex gap-2" action="/admin/apps">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Ad veya slug ile ara…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button className={buttonClass("outline", "md")}>Ara</button>
      </form>
      <Tabs items={STATUS.map((s) => ({ ...s, href: href(1, s.value) }))} current={status} />

      <Table head={["Uygulama", "Durum", "Beğeni", "Yorum", "Güncellendi", ""]} empty={data.items.length === 0}>
        {data.items.map((a) => {
          const chip = STATUS_CHIP[a.status];
          return (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/apps/${a.id}`} className="font-semibold hover:underline">
                  {a.name}
                </Link>
                <p className="text-xs text-muted">/{a.slug}</p>
              </td>
              <td className="px-4 py-3">
                <span className={chipClass(chip.color, "soft", "sm")}>{chip.label}</span>
              </td>
              <td className="px-4 py-3 tabular-nums">{a.likeCount}</td>
              <td className="px-4 py-3 tabular-nums">{a.reviewCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(a.updatedAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Link href={`/admin/apps/${a.id}`} className={buttonClass("outline", "sm")}>
                    <Pencil className="size-3.5" aria-hidden="true" /> Düzenle
                  </Link>
                  {a.status === "Published" ? (
                    <>
                      <a href={`/software/${a.slug}`} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")} title="Sitede gör">
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                      <ActionButton action={setApplicationStatusAction.bind(null, a.id, "unpublish")} variant="ghost">
                        Yayından kaldır
                      </ActionButton>
                    </>
                  ) : (
                    <ActionButton action={setApplicationStatusAction.bind(null, a.id, "publish")} variant="primary">
                      Yayınla
                    </ActionButton>
                  )}
                  <ActionButton
                    action={setApplicationStatusAction.bind(null, a.id, "delete")}
                    variant="ghost"
                    className="text-danger"
                    confirm={`${a.name} silinsin mi? Sayfası 410 (kaldırıldı) döndürecek.`}
                  >
                    Sil
                  </ActionButton>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={data.page} totalPages={totalPages} hrefFor={(p) => href(p)} />
    </>
  );
}
