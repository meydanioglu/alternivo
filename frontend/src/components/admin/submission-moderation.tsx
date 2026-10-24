import { startReviewAction, saveInternalNoteAction } from "@/app/admin/submissions/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { dateTime } from "@/components/admin/admin-parts";
import { userApi } from "@/lib/auth/session";
import { InternalNoteForm } from "./internal-note-form";

interface Moderation {
  id: string;
  status: string;
  isPriority: boolean;
  priorityPaidAt: string | null;
  reviewDeadline: string | null;
  overdue: boolean;
  internalNote: string | null;
  reviewStartedAt: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  dataJson: string | null;
}

/** Review method, payment verification, deadline, internal note and audit history for one submission. */
export async function SubmissionModeration({ s }: { s: Moderation }) {
  const history = await userApi<AuditEntry[]>(`/api/v1/admin/submissions/${s.id}/history`, { persist: false }).catch(() => []);
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">İnceleme</p>
        <p className="mt-1 font-medium">{s.isPriority ? "Fast Review (ücretli)" : "Standart (ücretsiz)"}</p>
        {s.isPriority && s.priorityPaidAt && (
          <p className="text-success">Ödeme PayTR bildirimi ile doğrulandı: {dateTime(s.priorityPaidAt)}</p>
        )}
        {s.reviewDeadline && (
          <p className={s.overdue ? "font-semibold text-danger" : "text-muted"}>
            {s.overdue ? "Süre aşıldı" : "Son tarih"}: {dateTime(s.reviewDeadline)}
          </p>
        )}
        {s.reviewStartedAt && <p className="text-muted">İncelemeye alındı: {dateTime(s.reviewStartedAt)}</p>}
        {s.status === "Pending" && (
          <div className="mt-3">
            <ActionButton action={startReviewAction.bind(null, s.id)}>İncelemeye al</ActionButton>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Ücretli inceleme spam/güvenlik kontrollerini ve yayın kurallarını atlamaz.</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">İç not (gönderen görmez)</p>
        <InternalNoteForm id={s.id} note={s.internalNote} action={saveInternalNoteAction} />
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Geçmiş</p>
        {history.length === 0 ? (
          <p className="text-muted">Kayıt yok.</p>
        ) : (
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs">
            {history.map((h) => (
              <li key={h.id}>
                <span className="text-muted">{dateTime(h.createdAt)}</span> · {h.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
