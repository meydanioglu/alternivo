import Link from "next/link";
import { decideAlternativeAction } from "@/app/admin/actions";
import { AdminHeader, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  sourceSlug: string;
  sourceName: string;
  alternativeSlug: string;
  alternativeName: string;
  source: string;
  status: string;
  note: string | null;
  voteCount: number;
  createdAt: string;
}

const TABS = [
  { value: "pending", label: "Bekleyen" },
  { value: "approved", label: "Onaylanan" },
  { value: "rejected", label: "Reddedilen" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminAlternativesPage({ searchParams }: Props) {
  const { status = "pending" } = await searchParams;
  const rows = await userApi<Row[]>(`/api/v1/admin/alternatives?status=${encodeURIComponent(status)}`, { persist: false });

  return (
    <>
      <AdminHeader title="Alternatif önerileri" description="Üyelerin “X, Y'nin alternatifidir” önerileri. Onaylanan ilişki alternatif listelerinde görünür." />
      <Tabs items={TABS.map((t) => ({ ...t, href: `/admin/alternatives?status=${t.value}` }))} current={status} />
      <Table head={["Uygulama", "Alternatifi", "Not", "Oy", "Tarih", ""]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3">
              <Link href={`/software/${r.sourceSlug}`} target="_blank" className="font-medium hover:underline">
                {r.sourceName}
              </Link>
            </td>
            <td className="px-4 py-3">
              <Link href={`/software/${r.alternativeSlug}`} target="_blank" className="font-medium hover:underline">
                {r.alternativeName}
              </Link>
              <p className="text-xs text-muted">{r.source}</p>
            </td>
            <td className="max-w-xs px-4 py-3 text-muted">{r.note ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{r.voteCount}</td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(r.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-1.5">
                {r.status !== "Approved" && (
                  <ActionButton action={decideAlternativeAction.bind(null, r.id, "approve")} variant="primary">
                    Onayla
                  </ActionButton>
                )}
                {r.status !== "Rejected" && (
                  <ActionButton action={decideAlternativeAction.bind(null, r.id, "reject")} variant="ghost" className="text-danger">
                    Reddet
                  </ActionButton>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
