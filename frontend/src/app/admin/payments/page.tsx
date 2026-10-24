import { AdminHeader, Table, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/layout/page-parts";
import { chipClass } from "@/components/ui/styles";
import { formatPrice } from "@/lib/auth/integrations";
import { AuthApiError, userApi } from "@/lib/auth/session";
import { markRefundedAction } from "./actions";

interface Payment {
  id: string;
  merchantOid: string;
  planKey: string;
  status: "Pending" | "Paid" | "Failed";
  amountMinor: number;
  paidAmountMinor: number | null;
  currency: string;
  testMode: boolean;
  paymentType: string | null;
  failedReason: string | null;
  createdAt: string;
  email: string | null;
  entitlementId: string | null;
  refunded: boolean;
}

const STATUS = {
  Pending: { label: "Bekliyor", color: "default" },
  Paid: { label: "Ödendi", color: "success" },
  Failed: { label: "Başarısız", color: "danger" },
} as const;

export default async function AdminPaymentsPage() {
  const rows = await userApi<Payment[]>("/api/v1/admin/payments", { persist: false }).catch((e: unknown) => {
    if (e instanceof AuthApiError && e.status === 403) return null;
    throw e;
  });
  return (
    <>
      <AdminHeader
        title="Ödemeler"
        description="PayTR siparişleri. İade PayTR Mağaza Panelinden yapılır; ardından burada “İade edildi” olarak işaretleyin (satın alınan etki kaldırılır)."
      />
      {!rows ? (
        <EmptyState title="Yetkiniz yok">Ödemeleri yalnızca Admin ve Süper admin görebilir.</EmptyState>
      ) : (
        <Table head={["Sipariş", "Müşteri", "Tutar", "Durum", "Tarih", ""]} empty={rows.length === 0}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-sm">
                <p className="font-medium">{p.planKey}</p>
                <p className="font-mono text-xs text-muted">{p.merchantOid}</p>
              </td>
              <td className="px-4 py-3 text-sm">{p.email ?? "—"}</td>
              <td className="px-4 py-3 text-sm tabular-nums">
                {formatPrice(p.paidAmountMinor ?? p.amountMinor, p.currency)}
                {p.testMode && <span className="ml-1 text-xs text-warning">test</span>}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={chipClass(STATUS[p.status].color, "soft", "sm")}>{p.refunded ? "İade edildi" : STATUS[p.status].label}</span>
                {p.failedReason && <p className="mt-1 text-xs text-muted">{p.failedReason}</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateTime(p.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                {p.status === "Paid" && p.entitlementId && !p.refunded && (
                  <ActionButton
                    action={markRefundedAction.bind(null, p.entitlementId)}
                    variant="ghost"
                    className="text-danger"
                    confirm="PayTR panelinden iadeyi yaptınız mı? Satın alınan etki (öne çıkarma, kampanya vb.) kaldırılacak."
                  >
                    İade edildi
                  </ActionButton>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
