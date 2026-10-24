import Link from "next/link";
import { AdminHeader, Table, Tabs, dateTime } from "@/components/admin/admin-parts";
import { CampaignDecision } from "@/components/admin/campaign-decision";
import { formatPrice } from "@/lib/auth/integrations";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  planName: string;
  applicationName: string;
  applicationSlug: string;
  targetName: string | null;
  startsAt: string;
  endsAt: string;
  state: string;
  priceCents: number;
  paidAt: string | null;
  moderatorNote: string | null;
}

const STATE: Record<string, string> = {
  "awaiting-payment": "Ödeme bekleniyor",
  "reservation-expired": "Rezervasyon düştü",
  "pending-approval": "Ödendi — onay bekliyor",
  scheduled: "Planlandı",
  live: "Yayında",
  ended: "Bitti",
  rejected: "Reddedildi",
  canceled: "İptal",
};

type Props = { searchParams: Promise<{ state?: string }> };

export default async function AdminCampaignsPage({ searchParams }: Props) {
  const { state = "pending" } = await searchParams;
  const rows = await userApi<Row[]>(`/api/v1/admin/campaigns?state=${encodeURIComponent(state)}`, { persist: false });
  return (
    <>
      <AdminHeader title="Sponsorluklar" description="Ödenmiş kampanyalar yayına girmeden önce onayınızı bekler. Reddedilenlerin iadesini Freemius panelinden yapın." />
      <Tabs
        items={[
          { value: "pending", label: "Onay bekleyen", href: "/admin/campaigns?state=pending" },
          { value: "live", label: "Aktif / planlı", href: "/admin/campaigns?state=live" },
          { value: "all", label: "Tümü", href: "/admin/campaigns?state=all" },
        ]}
        current={state}
      />
      <Table head={["Kampanya", "Hedef", "Tarihler", "Durum", ""]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 text-sm">
              <p className="font-semibold">{r.planName}</p>
              <Link href={`/software/${r.applicationSlug}`} target="_blank" className="text-accent hover:underline">{r.applicationName}</Link>
              <p className="text-xs text-muted">{formatPrice(r.priceCents)}{r.paidAt && ` · ödendi ${dateTime(r.paidAt)}`}</p>
            </td>
            <td className="px-4 py-3 text-sm">{r.targetName ?? "—"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
              {dateTime(r.startsAt)}
              <br />
              {dateTime(r.endsAt)}
            </td>
            <td className="px-4 py-3 text-sm">
              {STATE[r.state] ?? r.state}
              {r.moderatorNote && <p className="text-xs text-muted">{r.moderatorNote}</p>}
            </td>
            <td className="px-4 py-3 text-right">{r.state === "pending-approval" && <CampaignDecision id={r.id} />}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
