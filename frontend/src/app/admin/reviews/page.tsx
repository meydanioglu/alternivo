import { Star } from "lucide-react";
import Link from "next/link";
import { setReviewStatusAction } from "@/app/admin/actions";
import { AdminHeader, Tabs, dateTime } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/layout/page-parts";
import { userApi } from "@/lib/auth/session";

interface Row {
  id: string;
  applicationSlug: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  userId: string;
  createdAt: string;
}

const TABS = [
  { value: "pending", label: "Onay bekleyen" },
  { value: "published", label: "Yayında" },
  { value: "hidden", label: "Gizlenen" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { status = "pending" } = await searchParams;
  const rows = await userApi<Row[]>(`/api/v1/admin/reviews?status=${encodeURIComponent(status)}`, { persist: false });

  return (
    <>
      <AdminHeader title="Yorumlar" description="Üye yorumlarını yayınlayın veya gizleyin." />
      <Tabs items={TABS.map((t) => ({ ...t, href: `/admin/reviews?status=${t.value}` }))} current={status} />
      {rows.length === 0 ? (
        <EmptyState title="Yorum yok" />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex" aria-label={`${r.rating} yıldız`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={n <= r.rating ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted"} aria-hidden="true" />
                    ))}
                  </span>
                  <Link href={`/software/${r.applicationSlug}`} target="_blank" className="text-sm font-medium text-accent hover:underline">
                    {r.applicationSlug}
                  </Link>
                </div>
                <span className="text-xs text-muted">{dateTime(r.createdAt)}</span>
              </div>
              <p className="mt-2 font-semibold">{r.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.status !== "Published" && (
                  <ActionButton action={setReviewStatusAction.bind(null, r.id, "published")} variant="primary">
                    Yayınla
                  </ActionButton>
                )}
                {r.status !== "Hidden" && (
                  <ActionButton action={setReviewStatusAction.bind(null, r.id, "hidden")} variant="ghost" className="text-danger">
                    Gizle
                  </ActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
