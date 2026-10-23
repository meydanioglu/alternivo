import { Bookmark, Clock, LogOut, Plus, Rocket, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { ProfileForm } from "@/components/account/profile-form";
import { ApplicationGrid } from "@/components/catalog/application-card";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { buttonClass, chipClass } from "@/components/ui/styles";
import type { ApplicationSummary } from "@/lib/api/types";
import { getCurrentUser, isStaff, userApi } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

interface MySubmission {
  id: string;
  name: string;
  websiteUrl: string;
  status: string;
  moderatorNote: string | null;
  createdAt: string;
}

const STATUS: Record<string, { label: string; color: "warning" | "success" | "danger" | "default" }> = {
  Pending: { label: "In review", color: "warning" },
  Approved: { label: "Live", color: "success" },
  Rejected: { label: "Not accepted", color: "danger" },
  NeedsChanges: { label: "Needs changes", color: "default" },
};

type Props = { searchParams: Promise<{ submitted?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const { submitted } = await searchParams;

  const [submissions, bookmarks] = await Promise.all([
    userApi<MySubmission[]>("/api/v1/users/me/submissions", { persist: false }).catch(() => []),
    userApi<ApplicationSummary[]>("/api/v1/users/me/bookmarks", { persist: false }).catch(() => []),
  ]);

  return (
    <Container className="py-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-xl font-bold text-accent-foreground">
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{user.displayName}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff(user) && (
            <Link href="/admin" className={buttonClass("outline", "md")}>
              <ShieldCheck className="size-4" aria-hidden="true" /> Moderation
            </Link>
          )}
          <Link href="/submit/new" className={buttonClass("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Submit a product
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={buttonClass("ghost", "md")}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </header>

      {submitted && (
        <p role="status" className="mt-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Thanks! Your product was submitted. A moderator will review it, usually within a few days.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Rocket className="size-5 text-accent" aria-hidden="true" /> Your submissions
            </h2>
            {submissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                action={
                  <Link href="/submit/new" className={buttonClass("primary", "sm", "mt-2")}>
                    Submit your first product
                  </Link>
                }
              >
                Built something great? Get it listed and in front of people looking for alternatives.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {submissions.map((s) => {
                  const status = STATUS[s.status] ?? { label: s.status, color: "default" as const };
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted">{s.websiteUrl}</p>
                        {s.moderatorNote && <p className="mt-1 text-sm text-foreground/80">Moderator: {s.moderatorNote}</p>}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Clock className="size-3.5" aria-hidden="true" /> {formatDate(s.createdAt)}
                      </span>
                      <span className={chipClass(status.color, "soft", "sm")}>{status.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Bookmark className="size-5 text-accent" aria-hidden="true" /> Saved apps
            </h2>
            {bookmarks.length === 0 ? (
              <EmptyState title="Nothing saved yet">Use the Save button on any app page to keep it here.</EmptyState>
            ) : (
              <ApplicationGrid apps={bookmarks} />
            )}
          </section>
        </div>

        <aside>
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-semibold">Profile</h2>
            <ProfileForm displayName={user.displayName} email={user.email} />
          </section>
        </aside>
      </div>
    </Container>
  );
}
