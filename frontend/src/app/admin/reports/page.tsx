import { resolveReportAction } from "@/app/admin/actions";
import { AdminHeader, Table, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { chipClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
}

const STATUS: Record<string, { label: string; color: "warning" | "success" | "default" }> = {
  Open: { label: "Açık", color: "warning" },
  Resolved: { label: "Çözüldü", color: "success" },
  Dismissed: { label: "Yok sayıldı", color: "default" },
};

export default async function AdminReportsPage() {
  const rows = await userApi<Row[]>("/api/v1/admin/reports", { persist: false });

  return (
    <>
      <AdminHeader title="Şikayetler" description="Üyelerin bildirdiği hatalı bilgi, spam veya uygunsuz içerik." />
      <Table head={["Tür", "Sebep", "Detay", "Durum", "Tarih", ""]} empty={rows.length === 0}>
        {rows.map((r) => {
          const s = STATUS[r.status] ?? { label: r.status, color: "default" as const };
          return (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium">{r.targetType}</td>
              <td className="px-4 py-3">{r.reason}</td>
              <td className="max-w-sm px-4 py-3 text-muted">{r.details ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={chipClass(s.color, "soft", "sm")}>{s.label}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(r.createdAt)}</td>
              <td className="px-4 py-3">
                {r.status === "Open" && (
                  <div className="flex justify-end gap-1.5">
                    <ActionButton action={resolveReportAction.bind(null, r.id, "resolve")} variant="primary">
                      Çözüldü
                    </ActionButton>
                    <ActionButton action={resolveReportAction.bind(null, r.id, "dismiss")} variant="ghost">
                      Yok say
                    </ActionButton>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
