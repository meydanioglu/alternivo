import { ArrowLeft, CircleAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminHeader, dateTime } from "@/components/admin/admin-parts";
import { SubmissionModeration } from "@/components/admin/submission-moderation";
import { type SubmissionData, SubmissionReviewForm } from "@/components/admin/submission-review";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { api } from "@/lib/api/client";
import { userApi } from "@/lib/auth/session";

interface Detail {
  submission: SubmissionData & { possibleDuplicateApplicationId: string | null; createdAt: string };
  submitter: { email: string; displayName: string | null; handle: string | null; createdAt: string } | null;
  duplicateSlug: string | null;
}

const LICENSES = [
  ["proprietary", "Proprietary"],
  ["mit", "MIT"],
  ["apache-2-0", "Apache 2.0"],
  ["gpl-3-0", "GPL 3.0"],
  ["agpl-3-0", "AGPL 3.0"],
  ["mpl-2-0", "MPL 2.0"],
  ["source-available", "Source available"],
] as const;

const STATUS: Record<string, string> = { Pending: "Onay bekliyor", InReview: "İnceleniyor", NeedsChanges: "Değişiklik istendi", Approved: "Onaylandı", Rejected: "Reddedildi" };

type Props = { params: Promise<{ id: string }> };

export default async function SubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  const [d, categories, platforms] = await Promise.all([
    userApi<Detail>(`/api/v1/admin/submissions/${id}`, { persist: false }),
    userApi<{ slug: string; name: string }[]>("/api/v1/admin/categories", { persist: false }),
    api.platforms(),
  ]);
  const s = d.submission;

  return (
    <>
      <Link href="/admin/submissions" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Gönderimler
      </Link>
      <AdminHeader
        title={s.name}
        description={`Gönderim tarihi: ${dateTime(s.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <span className={chipClass(s.status === "Pending" ? "warning" : s.status === "Approved" ? "success" : s.status === "Rejected" ? "danger" : "default", "soft", "md")}>
              {STATUS[s.status] ?? s.status}
            </span>
            <a href={s.websiteUrl} target="_blank" rel="noopener nofollow" className={buttonClass("outline", "sm")}>
              Siteyi aç <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Gönderen</p>
          {d.submitter ? (
            <>
              <p className="mt-1 font-medium">
                {d.submitter.displayName ?? "—"} {d.submitter.handle && <span className="text-muted">@{d.submitter.handle}</span>}
              </p>
              <p className="text-muted">{d.submitter.email}</p>
              <p className="mt-1 text-xs text-muted">Üyelik: {dateTime(d.submitter.createdAt)}</p>
            </>
          ) : (
            <p className="mt-1 text-muted">Kullanıcı bulunamadı.</p>
          )}
        </div>
        {d.duplicateSlug && (
          <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-medium">Katalogda benzer bir ürün var</p>
              <a href={`/software/${d.duplicateSlug}`} target="_blank" className="text-accent hover:underline">
                /software/{d.duplicateSlug}
              </a>
              <p className="mt-1 text-xs text-muted">Aynı ürünse reddedin veya gönderene not düşün.</p>
            </div>
          </div>
        )}
      </div>

      <SubmissionModeration s={s as unknown as Parameters<typeof SubmissionModeration>[0]["s"]} />

      <SubmissionReviewForm
        key={s.id + s.status}
        submission={s}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))}
        platforms={platforms.map((p) => ({ slug: p.slug, name: p.name }))}
        licenses={LICENSES}
      />
    </>
  );
}
