import { Search } from "lucide-react";
import { AdminHeader, Table, dateTime } from "@/components/admin/admin-parts";
import { type Member, MemberRow } from "@/components/admin/member-row";
import { EmptyState, Pagination } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { AuthApiError, getCurrentUser, userApi } from "@/lib/auth/session";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const me = await getCurrentUser();
  const qs = new URLSearchParams({ page });
  if (q) qs.set("q", q);

  const data = await userApi<{ items: Member[]; page: number; pageSize: number; totalCount: number }>(
    `/api/v1/admin/members?${qs}`,
    { persist: false },
  ).catch((e: unknown) => {
    if (e instanceof AuthApiError && e.status === 403) return null;
    throw e;
  });

  if (!data) {
    return (
      <>
        <AdminHeader title="Kullanıcılar" />
        <EmptyState title="Yetkiniz yok">Kullanıcıları yalnızca Admin ve Süper admin görebilir.</EmptyState>
      </>
    );
  }

  const canEditRoles = !!me?.roles.includes("SuperAdmin");
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));

  return (
    <>
      <AdminHeader
        title="Kullanıcılar"
        description={`${data.totalCount} üye. ${canEditRoles ? "Rollere tıklayarak yetki verin veya geri alın." : "Rolleri yalnızca Süper admin değiştirebilir."}`}
      />
      <form className="mb-4 flex gap-2" action="/admin/users">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="E-posta veya ad ile ara…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button className={buttonClass("outline", "md")}>Ara</button>
      </form>
      <Table head={["Üye", "Roller", "Durum", "Kayıt", ""]} empty={data.items.length === 0}>
        {data.items.map((m) => (
          <MemberRow key={m.id} member={m} canEditRoles={canEditRoles} joined={dateTime(m.createdAt)} />
        ))}
      </Table>
      <Pagination
        page={data.page}
        totalPages={totalPages}
        hrefFor={(p) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
      />
    </>
  );
}
