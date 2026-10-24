import { CheckCircle2, Clock, ExternalLink, Plus, Rocket, Sparkles, Star, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { SponsoredLabel } from "@/components/catalog/application-card";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { AssignForm } from "@/components/maker/assign-form";
import { buttonClass } from "@/components/ui/styles";
import { site } from "@/config/site";
import type { ApplicationSummary } from "@/lib/api/types";
import { billingConfig, checkoutUrl } from "@/lib/auth/integrations";
import { getCurrentUser, userApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Maker dashboard", robots: { index: false } };

interface MakerDashboard {
  stats: { submitted: number; approved: number; pending: number; featured: number; launches: number };
  submissions: {
    id: string;
    name: string;
    websiteUrl: string;
    status: "Pending" | "NeedsChanges" | "Approved" | "Rejected" | string;
    moderatorNote: string | null;
    isPriority: boolean;
    applicationSlug: string | null;
    createdAt: string;
  }[];
  products: { application: ApplicationSummary; featuredUntil: string | null; launchBoosted: boolean; publishedAt: string | null }[];
  entitlements: {
    id: string;
    kind: "Featured" | "FastTrack" | "LaunchBoost" | "Unknown";
    active: boolean;
    expiration: string | null;
    canceled: boolean;
    targetId: string | null;
    targetName: string | null;
    createdAt: string;
  }[];
}

const PLANS = [
  {
    key: "fastTrack" as const,
    kind: "FastTrack",
    icon: Zap,
    name: "Fast track review",
    price: "$19 one-time",
    text: "Your submission jumps to the front of the moderation queue. Approval is still based on our editorial guidelines.",
  },
  {
    key: "launchBoost" as const,
    kind: "LaunchBoost",
    icon: Rocket,
    name: "Launch boost",
    price: "$29 one-time",
    text: "Pin your launch to the top of its Buildboard week with a clear “Sponsored” label. Votes and ranks stay organic.",
  },
  {
    key: "featured" as const,
    kind: "Featured",
    icon: Star,
    name: "Featured listing",
    price: "$49 / month",
    text: "A “Featured” badge and a spot in the featured strip on the home and AIs pages. Cancel any time.",
  },
];

const STATUS: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending review", className: "bg-warning/10 text-warning" },
  NeedsChanges: { label: "Needs changes", className: "bg-warning/10 text-warning" },
  Approved: { label: "Approved", className: "bg-success/10 text-success" },
  Rejected: { label: "Rejected", className: "bg-danger/10 text-danger" },
};

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

type Props = { searchParams: Promise<{ purchase?: string }> };

export default async function MakerPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/maker");
  const [data, billing, { purchase }] = await Promise.all([
    userApi<MakerDashboard>("/api/v1/maker", { persist: false }),
    billingConfig(),
    searchParams,
  ]);

  const pendingSubmissions = data.submissions.filter((s) => s.status === "Pending" || s.status === "NeedsChanges");
  const liveProducts = data.products.map((p) => ({ id: p.application.id, name: p.application.name }));
  const stats = [
    { label: "Your AIs", value: data.stats.submitted },
    { label: "Approved", value: data.stats.approved },
    { label: "Pending review", value: data.stats.pending },
    { label: "Buildboard launches", value: data.stats.launches },
  ];

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Maker dashboard</p>
          <h1 className="text-2xl font-bold">Welcome back, {user.displayName}</h1>
        </div>
        <Link href="/submit/new" className={buttonClass("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" /> Submit an AI
        </Link>
      </div>

      {purchase && (
        <p role="status" className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Thanks for your purchase! It appears under “Your boosts” within a minute — then choose the product to apply it to.
        </p>
      )}

      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section aria-labelledby="your-ais">
            <h2 id="your-ais" className="mb-3 text-lg font-semibold">Your AIs</h2>
            {data.products.length === 0 ? (
              <EmptyState title="Nothing live yet">Approved submissions show up here with their placement status.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.products.map((p) => (
                  <li key={p.application.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <ApplicationLogo name={p.application.name} logoUrl={p.application.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/software/${p.application.slug}`} className="font-medium hover:underline">
                        {p.application.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{p.application.shortDescription}</p>
                    </div>
                    {p.featuredUntil && new Date(p.featuredUntil) > new Date() && (
                      <span title={`Featured until ${date(p.featuredUntil)}`}><SponsoredLabel>Featured</SponsoredLabel></span>
                    )}
                    {p.launchBoosted && <SponsoredLabel>Boosted launch</SponsoredLabel>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="submissions">
            <h2 id="submissions" className="mb-3 text-lg font-semibold">Submissions</h2>
            {data.submissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                action={<Link href="/submit/new" className={buttonClass("outline", "sm", "mt-2")}>Submit your first AI</Link>}
              >
                Submitting is free during our launch period. Every submission is reviewed by our team.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.submissions.map((s) => {
                  const status = STATUS[s.status] ?? { label: s.status, className: "bg-surface-secondary text-muted" };
                  return (
                    <li key={s.id} className="rounded-xl border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                        {s.isPriority && <SponsoredLabel>Fast track</SponsoredLabel>}
                        <span className="ml-auto text-xs text-muted">{date(s.createdAt)}</span>
                      </div>
                      {s.moderatorNote && <p className="mt-2 text-sm text-muted">Note from the team: {s.moderatorNote}</p>}
                      {s.applicationSlug && (
                        <Link href={`/software/${s.applicationSlug}`} className="mt-1 inline-block text-sm text-accent hover:underline">
                          View listing
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.entitlements.length > 0 && (
            <section aria-labelledby="boosts">
              <h2 id="boosts" className="mb-3 text-lg font-semibold">Your boosts</h2>
              <ul className="flex flex-col gap-2">
                {data.entitlements.map((e) => {
                  const plan = PLANS.find((p) => p.kind === e.kind);
                  const targets = e.kind === "FastTrack" ? pendingSubmissions.map((s) => ({ id: s.id, name: s.name })) : liveProducts;
                  const canAssign = e.active && plan && (e.kind === "Featured" || !e.targetId);
                  return (
                    <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{plan?.name ?? "Unknown plan"}</span>
                        {e.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Clock className="size-3.5" aria-hidden="true" /> {e.canceled ? "Cancelled" : "Expired"}
                          </span>
                        )}
                        {e.expiration && <span className="text-xs text-muted">· until {date(e.expiration)}</span>}
                        {e.targetName && <span className="ml-auto text-xs text-muted">Applied to {e.targetName}</span>}
                      </div>
                      {canAssign && <AssignForm entitlementId={e.id} targets={targets} currentId={e.targetId} />}
                    </li>
                  );
                })}
              </ul>
              <a
                href="https://users.freemius.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                Invoices, receipts and subscription management <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <Rocket className="size-4 text-accent" aria-hidden="true" /> Buildboard
            </h2>
            <p className="text-sm text-muted">
              Approved submissions go live on the weekly Buildboard, where the community votes for the best launches.
            </p>
            <Link href="/launches" className="mt-2 inline-block text-sm text-accent hover:underline">
              See this week&apos;s launches
            </Link>
          </section>

          <section aria-labelledby="grow" className="rounded-xl border border-border bg-surface p-4">
            <h2 id="grow" className="mb-3 flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-accent" aria-hidden="true" /> Grow your launch
            </h2>
            <ul className="flex flex-col gap-4">
              {PLANS.map((p) => {
                const planId = billing.plans[p.key];
                const href =
                  billing.enabled && billing.productId && planId
                    ? checkoutUrl(billing.productId, planId, user.email, `${site.url}/maker?purchase=1`)
                    : null;
                return (
                  <li key={p.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <p.icon className="size-4 text-accent" aria-hidden="true" />
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-sm text-muted">{p.price}</span>
                    </div>
                    <p className="text-sm text-muted">{p.text}</p>
                    {href ? (
                      <a href={href} className={buttonClass("outline", "sm", "self-start")}>
                        Buy
                      </a>
                    ) : (
                      <span className="text-xs text-muted">Available soon</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Payments are processed by Freemius, our reseller and merchant of record. Paid placements are always labelled. See our{" "}
              <Link href="/terms#paid-services" className="underline">terms</Link>.
            </p>
          </section>
        </aside>
      </div>
    </Container>
  );
}
