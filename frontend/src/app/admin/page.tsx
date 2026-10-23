import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ModerationRow, type SubmissionRow } from "@/components/account/moderation-row";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { cx } from "@/components/ui/styles";
import { getCurrentUser, isStaff, userApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "needschanges", label: "Needs changes" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user)) notFound();

  const { status = "pending" } = await searchParams;
  const result = await userApi<{ items: SubmissionRow[]; totalCount: number }>(
    `/api/v1/admin/submissions?status=${encodeURIComponent(status)}`,
    { persist: false },
  ).catch(() => ({ items: [] as SubmissionRow[], totalCount: 0 }));

  return (
    <Container className="max-w-4xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Product submissions</h1>
      <p className="mt-1 text-sm text-muted">Approving publishes the product immediately and links any suggested alternatives.</p>

      <nav aria-label="Status" className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin?status=${t.value}`}
            aria-current={status === t.value ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              status === t.value ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing here">No submissions with this status.</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {result.items.map((row) => (
            <ModerationRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </Container>
  );
}
