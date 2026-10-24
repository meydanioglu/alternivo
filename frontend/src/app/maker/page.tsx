import { ExternalLink, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelCampaignAction } from "@/app/maker/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { SponsoredLabel } from "@/components/catalog/application-card";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { AssignForm } from "@/components/maker/assign-form";
import { CampaignForm, CheckoutButton } from "@/components/maker/maker-forms";
import { buttonClass, cx } from "@/components/ui/styles";
import { api } from "@/lib/api/client";
import type { ApplicationSummary, Category } from "@/lib/api/types";
import { billingConfig, formatPrice, pricing } from "@/lib/auth/integrations";
import { getCurrentUser, userApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Maker dashboard", robots: { index: false, follow: false } };

interface MakerDashboard {
  stats: { submitted: number; approved: number; pending: number; featured: number; launches: number; activeCampaigns: number; activeSubscriptions: number };
  submissions: {
    id: string;
    name: string;
    status: string;
    moderatorNote: string | null;
    isPriority: boolean;
    applicationSlug: string | null;
    createdAt: string;
    reviewMethod: "standard" | "fast";
    paymentStatus: "none" | "awaiting" | "paid";
    reviewDeadline: string | null;
    canUpgrade: boolean;
  }[];
  products: { application: ApplicationSummary; featuredUntil: string | null; growthUntil: string | null; publishedAt: string | null }[];
  entitlements: {
    id: string;
    kind: string;
    active: boolean;
    expiration: string | null;
    canceled: boolean;
    targetId: string | null;
    targetName: string | null;
    createdAt: string;
    planName: string | null;
    priceCents: number | null;
    currency: string | null;
    recurring: boolean;
  }[];
  campaigns: {
    id: string;
    planKey: string;
    planName: string;
    applicationName: string;
    targetName: string | null;
    startsAt: string;
    endsAt: string;
    state: string;
    priceCents: number;
    moderatorNote: string | null;
  }[];
  foundingVendor: boolean;
}

interface Analytics {
  days: number;
  profileViews: number;
  impressions: number;
  clicks: number;
  clickThroughRate: number;
  daily: { day: string; profileViews: number; impressions: number; clicks: number }[];
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "My products" },
  { key: "campaigns", label: "Campaigns" },
  { key: "analytics", label: "Analytics" },
  { key: "billing", label: "Billing" },
] as const;

const STATUS: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending review", className: "bg-warning/10 text-warning" },
  InReview: { label: "In review", className: "bg-accent/10 text-accent" },
  NeedsChanges: { label: "Needs changes", className: "bg-warning/10 text-warning" },
  Approved: { label: "Approved", className: "bg-success/10 text-success" },
  Rejected: { label: "Rejected", className: "bg-danger/10 text-danger" },
};

const CAMPAIGN_STATE: Record<string, string> = {
  "awaiting-payment": "Awaiting payment",
  "reservation-expired": "Reservation expired",
  "pending-approval": "Paid — awaiting approval",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
  rejected: "Rejected (refunded)",
  canceled: "Canceled",
};

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const future = (iso: string | null) => !!iso && new Date(iso) > new Date();

function flatten(categories: Category[]): { slug: string; name: string }[] {
  return categories.flatMap((c) => [{ slug: c.slug, name: c.name }, ...flatten(c.children ?? [])]);
}

type Props = { searchParams: Promise<{ tab?: string; purchase?: string; submitted?: string; fast?: string; canceled?: string; days?: string }> };

export default async function MakerPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/maker");
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "overview";
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;

  const [data, billing, prices, analytics, categories] = await Promise.all([
    userApi<MakerDashboard>("/api/v1/maker", { persist: false }),
    billingConfig(),
    pricing(),
    tab === "analytics" || tab === "overview" ? userApi<Analytics>(`/api/v1/maker/analytics?days=${tab === "overview" ? 30 : days}`, { persist: false }) : null,
    tab === "campaigns" ? api.categories().catch(() => [] as Category[]) : Promise.resolve([] as Category[]),
  ]);
  const can = (plan: string) => billing.enabled && billing.plans.includes(plan);
  const priceOf = (plan: string) => {
    const p = prices.plans.find((x) => x.key === plan);
    return p ? `${formatPrice(p.priceCents, prices.currency)}${p.recurring ? " / 30 days" : ""}` : "";
  };
  const products = data.products.map((p) => ({ id: p.application.id, name: p.application.name }));

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Maker dashboard{data.foundingVendor && " · Founding vendor"}</p>
          <h1 className="text-2xl font-bold">Welcome back, {user.displayName}</h1>
        </div>
        <Link href="/submit/new" className={buttonClass("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" /> Submit an AI
        </Link>
      </div>

      {params.submitted && (
        <Notice tone={params.fast === "unavailable" ? "warning" : "success"}>
          {params.fast === "unavailable"
            ? "Your product was submitted for standard review. Fast Review checkout is not available right now — you can upgrade below later."
            : "Thanks! Your product was submitted. You can follow its review status below."}
        </Notice>
      )}
      {params.purchase && (
        <Notice tone="success">
          Payment received. It is applied as soon as PayTR confirms it (usually within seconds) — refresh if you don't see it yet.
        </Notice>
      )}
      {params.canceled && <Notice tone="warning">Checkout was canceled. You have not been charged.</Notice>}

      <nav aria-label="Maker sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/maker?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cx("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", tab === t.key ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="flex flex-col gap-8">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Your products" value={data.products.length} />
            <Stat label="Pending submissions" value={data.stats.pending} />
            <Stat label="Active subscriptions" value={data.stats.activeSubscriptions} />
            <Stat label="Live campaigns" value={data.stats.activeCampaigns} />
            {analytics && (
              <>
                <Stat label="Profile views (30d)" value={analytics.profileViews} />
                <Stat label="Sponsor impressions (30d)" value={analytics.impressions} />
                <Stat label="Outbound clicks (30d)" value={analytics.clicks} />
                <Stat label="Click-through rate" value={`${analytics.clickThroughRate}%`} />
              </>
            )}
          </dl>
          <Submissions data={data} can={can} priceOf={priceOf} />
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <Rocket className="size-4 text-accent" aria-hidden="true" /> Buildboard
            </h2>
            <p className="text-sm text-muted">Approved submissions launch on the weekly Buildboard, where the community votes for the best launches.</p>
            <Link href="/launches" className="mt-2 inline-block text-sm text-accent hover:underline">See this week&apos;s launches</Link>
          </section>
        </div>
      )}

      {tab === "products" && (
        <div className="flex flex-col gap-8">
          {data.products.length === 0 ? (
            <EmptyState title="No live products yet">Once a submission is approved, you can promote it here.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.products.map((p) => {
                const growth = future(p.growthUntil);
                const featured = future(p.featuredUntil);
                return (
                  <li key={p.application.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ApplicationLogo name={p.application.name} logoUrl={p.application.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/software/${p.application.slug}`} className="font-medium hover:underline">{p.application.name}</Link>
                        <p className="truncate text-xs text-muted">{p.application.shortDescription}</p>
                      </div>
                      {growth ? <SponsoredLabel>Growth</SponsoredLabel> : featured && <SponsoredLabel>Featured</SponsoredLabel>}
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <div className="flex flex-wrap gap-2">
                        {can("featured") && !growth && (
                          <CheckoutButton plan="featured" targetId={p.application.id} label={`${featured ? "Extend Featured" : "Featured"} ${priceOf("featured")}`} />
                        )}
                        {can("growth") && (
                          <CheckoutButton plan="growth" targetId={p.application.id} label={`${growth ? "Extend Growth" : "Growth"} ${priceOf("growth")}`} variant="primary" />
                        )}
                        {!can("featured") && !can("growth") && <span className="text-xs text-muted">Promotion available soon</span>}
                      </div>
                      {featured && <span className="text-xs text-muted">Active until {date((growth ? p.growthUntil : p.featuredUntil)!)} · no automatic renewal</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Submissions data={data} can={can} priceOf={priceOf} />
          <p className="text-sm text-muted">
            Your product is already listed but was added by someone else? Claiming listings is not self-serve yet — see the{" "}
            <Link href="/help" className="text-accent underline">Help center</Link>.
          </p>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="flex flex-col gap-8">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-1 font-semibold">Create a campaign</h2>
            <p className="mb-4 text-sm text-muted">
              Fixed-length placements for your approved products. See <Link href="/pricing" className="text-accent underline">pricing</Link> for details.
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-muted">You need an approved product before you can run a campaign.</p>
            ) : (
              <CampaignForm
                products={products}
                categories={flatten(categories).sort((a, b) => a.name.localeCompare(b.name))}
                plans={prices.plans.filter((p) => p.inventoryLimit !== null && can(p.key)).map((p) => ({
                  key: p.key,
                  label: `${p.name} — ${formatPrice(p.priceCents, prices.currency)} / ${p.durationDays} days`,
                }))}
              />
            )}
          </section>
          <section>
            <h2 className="mb-3 font-semibold">Your campaigns</h2>
            {data.campaigns.length === 0 ? (
              <p className="text-sm text-muted">No campaigns yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-sm sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.planName} · {c.applicationName}</p>
                      <p className="text-xs text-muted">
                        {c.targetName && `${c.targetName} · `}{date(c.startsAt)} – {date(c.endsAt)}
                      </p>
                      {c.moderatorNote && <p className="mt-1 text-xs text-muted">Note: {c.moderatorNote}</p>}
                    </div>
                    <span className="text-xs font-medium">{CAMPAIGN_STATE[c.state] ?? c.state}</span>
                    {c.state === "awaiting-payment" && (
                      <div className="flex gap-2">
                        <CheckoutButton plan={c.planKey} targetId={c.id} label="Pay now" variant="primary" />
                        <ActionButton action={cancelCampaignAction.bind(null, c.id)} variant="ghost">Cancel</ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "analytics" && analytics && (
        <div className="flex flex-col gap-6">
          <nav aria-label="Date range" className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/maker?tab=analytics&days=${d}`} className={buttonClass(d === days ? "primary" : "outline", "sm")}>
                Last {d} days
              </Link>
            ))}
          </nav>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Profile views" value={analytics.profileViews} />
            <Stat label="Sponsor impressions" value={analytics.impressions} />
            <Stat label="Outbound clicks" value={analytics.clicks} />
            <Stat label="Click-through rate" value={`${analytics.clickThroughRate}%`} />
          </dl>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Day</th>
                  <th className="px-4 py-2 font-medium">Profile views</th>
                  <th className="px-4 py-2 font-medium">Impressions</th>
                  <th className="px-4 py-2 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {[...analytics.daily].reverse().map((d) => (
                  <tr key={d.day} className="border-t border-border tabular-nums">
                    <td className="px-4 py-1.5">{d.day}</td>
                    <td className="px-4 py-1.5">{d.profileViews}</td>
                    <td className="px-4 py-1.5">{d.impressions}</td>
                    <td className="px-4 py-1.5">{d.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            Impressions count when a sponsored spot is at least half visible; repeat views and clicks from the same visitor within 30 minutes are counted once.
          </p>
        </div>
      )}

      {tab === "billing" && (
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-2 font-semibold">Plan</h2>
            <p>
              {data.entitlements.some((e) => e.active && (e.kind === "Growth" || e.kind === "Featured"))
                ? data.entitlements.filter((e) => e.active && (e.kind === "Growth" || e.kind === "Featured")).map((e) => `${e.planName} for ${e.targetName ?? "—"}`).join(", ")
                : "Free"}
            </p>
            <p className="mt-2 text-muted">
              Card payments are processed by PayTR. Featured and Growth are prepaid 30-day periods: they never renew automatically —
              buy another period from My products to extend. For invoices or refunds, see the{" "}
              <Link href="/help" className="text-accent underline">Help center</Link>.
            </p>
          </section>
          <section>
            <h2 className="mb-3 font-semibold">Payment history</h2>
            {data.entitlements.length === 0 ? (
              <p className="text-sm text-muted">No payments yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.entitlements.map((e) => {
                  const targets = e.kind === "FastTrack"
                    ? data.submissions.filter((s) => s.canUpgrade).map((s) => ({ id: s.id, name: s.name }))
                    : e.kind === "Featured" || e.kind === "Growth" ? products
                      : data.campaigns.filter((c) => c.state === "awaiting-payment" || c.state === "reservation-expired").map((c) => ({ id: c.id, name: `${c.planName} · ${c.applicationName}` }));
                  return (
                    <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.planName ?? "Unknown plan"}</span>
                        {e.priceCents !== null && <span className="text-muted">{formatPrice(e.priceCents, e.currency ?? "USD")}{e.recurring && " · 30 days"}</span>}
                        <span className={cx("text-xs", e.active ? "text-success" : "text-muted")}>
                          {e.active ? (e.recurring ? "Active subscription" : "Paid") : e.canceled ? "Canceled / refunded" : "Expired"}
                        </span>
                        {e.expiration && e.recurring && <span className="text-xs text-muted">· renews or ends {date(e.expiration)}</span>}
                        <span className="ml-auto text-xs text-muted">{date(e.createdAt)}</span>
                      </div>
                      {e.targetName ? (
                        <p className="text-xs text-muted">Applied to {e.targetName}</p>
                      ) : (
                        e.active && (
                          <div>
                            <p className="mb-1 text-xs text-warning">Not linked yet — choose what this purchase is for.</p>
                            <AssignForm entitlementId={e.id} targets={targets} currentId={null} />
                          </div>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}

function Notice({ tone, children }: { tone: "success" | "warning"; children: React.ReactNode }) {
  return (
    <p role="status" className={cx("mb-6 rounded-lg border px-4 py-3 text-sm", tone === "success" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning")}>
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Submissions({ data, can, priceOf }: { data: MakerDashboard; can: (p: string) => boolean; priceOf: (p: string) => string }) {
  return (
    <section aria-labelledby="submissions">
      <h2 id="submissions" className="mb-3 text-lg font-semibold">Submissions</h2>
      {data.submissions.length === 0 ? (
        <EmptyState title="No submissions yet" action={<Link href="/submit/new" className={buttonClass("outline", "sm", "mt-2")}>Submit your first product</Link>}>
          Submitting is free. Every submission is reviewed by our team.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.submissions.map((s) => {
            const status = STATUS[s.status] ?? { label: s.status, className: "bg-surface-secondary text-muted" };
            const open = ["Pending", "InReview", "NeedsChanges"].includes(s.status);
            return (
              <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                  {s.isPriority && <SponsoredLabel>Fast Review</SponsoredLabel>}
                  {s.paymentStatus === "awaiting" && <span className="text-xs text-warning">Awaiting payment confirmation</span>}
                  <span className="ml-auto text-xs text-muted">Submitted {date(s.createdAt)}</span>
                </div>
                <p className="text-xs text-muted">
                  {s.reviewMethod === "fast" ? "Fast Review (paid)" : "Standard review (free)"}
                  {open && s.reviewDeadline && ` · review by ${date(s.reviewDeadline)}`}
                </p>
                {s.moderatorNote && <p className="text-muted">Note from the team: {s.moderatorNote}</p>}
                {s.applicationSlug && <Link href={`/software/${s.applicationSlug}`} className="text-accent hover:underline">View listing</Link>}
                {s.canUpgrade && can("fastReview") && (
                  <div className="self-start">
                    <CheckoutButton plan="fastReview" targetId={s.id} label={`Speed up your review — ${priceOf("fastReview")}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
