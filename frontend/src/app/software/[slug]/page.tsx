import { ArrowRight, BadgeCheck, CircleAlert, ExternalLink, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, site } from "@/config/site";
import { api } from "@/lib/api/client";
import type { ApplicationSummary } from "@/lib/api/types";
import { formatDate, pricingLabel } from "@/lib/format";
import { loadOrNotFound } from "@/lib/resolve";
import { pageMetadata, softwareJsonLd } from "@/lib/seo";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { CommunityStats, CompactApplicationRow } from "@/components/catalog/application-card";
import { AttributeBadges, CategoryChip, LicenseBadge, PlatformBadge, PricingBadge } from "@/components/catalog/badges";
import { RatingSummary, ReviewCard } from "@/components/catalog/review-card";
import { ShareButton } from "@/components/catalog/share-button";
import { LikeSaveButtons, ReviewForm } from "@/components/catalog/community-actions";
import { getCurrentUser, userApi } from "@/lib/auth/session";
import { BreadcrumbNavigation, Container, SectionHeader } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClass, chipClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const load = (slug: string) => loadOrNotFound(() => api.application(slug), `/software/${slug}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await load(slug);
  const s = app.summary;
  return pageMetadata({
    title: `${s.name}: Features, Pricing & Alternatives`,
    description: `${s.shortDescription} Compare ${s.name} pricing, platforms and license, and explore ${app.alternativesCount} alternatives.`.slice(0, 300),
    path: `/software/${s.slug}`,
  });
}

function SideList({ title, apps, href }: { title: string; apps: ApplicationSummary[]; href?: string }) {
  if (apps.length === 0) return null;
  return (
    <section>
      <SectionHeader title={title} href={href} />
      <ul className="rounded-lg border border-border bg-surface p-1">
        {apps.map((a) => (
          <CompactApplicationRow key={a.id} app={a} />
        ))}
      </ul>
    </section>
  );
}

export default async function SoftwarePage({ params }: Props) {
  const { slug } = await params;
  const app = await load(slug);
  const s = app.summary;
  const category = app.categories[0];
  const topAlternative = app.topAlternatives[0];
  const compareSlug = topAlternative ? [s.slug, topAlternative.slug].sort().join("-vs-") : null;

  const user = await getCurrentUser();
  const [vote, bookmarks] = user
    ? await Promise.all([
        userApi<{ voted: boolean; count: number }>(`/api/v1/applications/${s.id}/votes`, { persist: false }).catch(() => null),
        userApi<ApplicationSummary[]>("/api/v1/users/me/bookmarks", { persist: false }).catch(() => []),
      ])
    : [null, []];

  return (
    <Container className="py-6">
      <JsonLd data={softwareJsonLd(app)} />
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          ...(category ? [{ name: category.name, path: `/category/${category.slug}` }] : [{ name: "Software", path: "/software" }]),
          { name: s.name, path: `/software/${s.slug}` },
        ]}
      />

      <header className="mt-4 flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-start">
        <ApplicationLogo name={s.name} logoUrl={s.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.name}</h1>
            <CommunityStats app={s} />
          </div>
          {app.developer && <p className="text-sm text-muted">by {app.developer}</p>}
          <p className="mt-2 max-w-3xl text-pretty text-base text-foreground/85">{s.shortDescription}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <PricingBadge pricing={s.pricing} />
            <LicenseBadge license={s.license} />
            <AttributeBadges app={s} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:w-64 md:flex-col md:items-stretch">
          <LikeSaveButtons
            applicationId={s.id}
            path={`/software/${s.slug}`}
            signedIn={!!user}
            liked={vote?.voted ?? false}
            likeCount={vote?.count ?? s.likeCount}
            saved={bookmarks.some((b) => b.id === s.id)}
          />
          <Link href={`/software/${s.slug}/alternatives`} className={buttonClass("primary", "md")}>
            Find alternatives <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          {app.websiteUrl && (
            <a href={app.websiteUrl} target="_blank" rel="noopener" className={buttonClass("outline", "md")}>
              Visit official website <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
          {compareSlug && topAlternative && (
            <Link href={`/compare/${compareSlug}`} className={buttonClass("ghost", "md")}>
              <Scale className="size-4" aria-hidden="true" /> Compare with {topAlternative.name}
            </Link>
          )}
          <ShareButton title={`${s.name} on ${site.name}`} url={absoluteUrl(`/software/${s.slug}`)} />
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-8">
          {app.screenshots.length === 0 && (
            // No preview image published by the product: show a generated brand card instead of an empty gap.
            <div
              aria-hidden="true"
              className="relative flex aspect-[1200/630] w-full max-w-3xl items-center justify-center gap-5 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/25 via-surface to-surface p-8"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/20 blur-3xl" />
              <ApplicationLogo name={s.name} logoUrl={s.logoUrl} size="lg" />
              <div className="relative min-w-0">
                <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{s.name}</p>
                <p className="mt-1 line-clamp-2 max-w-md text-sm text-muted">{s.shortDescription}</p>
              </div>
            </div>
          )}

          {app.screenshots.length > 0 && (
            <section aria-label={`${s.name} preview`}>
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {app.screenshots.map((shot) => (
                  <figure key={shot.url} className="w-full shrink-0 snap-start sm:w-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element -- first-party media with known dimensions */}
                    <img
                      src={shot.url}
                      alt={shot.caption ?? `${s.name} screenshot`}
                      width={shot.width || 1200}
                      height={shot.height || 630}
                      loading="lazy"
                      className="aspect-[1200/630] w-full max-w-3xl rounded-xl border border-border bg-surface object-cover"
                    />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {app.description && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">About {s.name}</h2>
              <p className="max-w-prose whitespace-pre-line text-pretty leading-relaxed text-foreground/85">{app.description}</p>
            </section>
          )}

          {app.features.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Features</h2>
              <ul className="flex flex-wrap gap-2">
                {app.features.map((f) => (
                  <li key={f.slug} className={chipClass("default", "secondary", "md")}>
                    {f.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s.platforms.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Platforms</h2>
              <ul className="flex flex-wrap gap-2">
                {s.platforms.map((p) => (
                  <li key={p.slug}>
                    <PlatformBadge platform={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionHeader
              title={`Top ${s.name} alternatives`}
              href={app.alternativesCount > 0 ? `/software/${s.slug}/alternatives` : undefined}
              linkLabel={`See all ${app.alternativesCount}`}
            />
            {app.topAlternatives.length > 0 ? (
              <ol className="rounded-lg border border-border bg-surface p-1">
                {app.topAlternatives.map((a, i) => (
                  <CompactApplicationRow key={a.id} app={a} rank={i + 1} />
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No alternatives have been mapped for {s.name} yet.</p>
            )}
          </section>

          <section id="reviews" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <a href={user ? "#write-review" : `/login?next=/software/${s.slug}`} className={buttonClass("outline", "sm")}>
                Write a review
              </a>
            </div>
            <RatingSummary average={s.ratingAverage} count={s.reviewCount} />
            <div className="mt-4">
              <ReviewForm applicationId={s.id} slug={s.slug} name={s.name} signedIn={!!user} />
            </div>
            {app.recentReviews.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {app.recentReviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {app.developer && (
                <>
                  <dt className="text-muted">Developer</dt>
                  <dd>{app.developer}</dd>
                </>
              )}
              <dt className="text-muted">Pricing</dt>
              <dd>{s.pricing.length > 0 ? s.pricing.map(pricingLabel).join(", ") : "Unknown"}</dd>
              {s.license && (
                <>
                  <dt className="text-muted">License</dt>
                  <dd>{s.license.name}</dd>
                </>
              )}
              {app.releasedOn && (
                <>
                  <dt className="text-muted">First released</dt>
                  <dd>{formatDate(app.releasedOn)}</dd>
                </>
              )}
              {app.websiteUrl && (
                <>
                  <dt className="text-muted">Website</dt>
                  <dd className="truncate">
                    <a href={app.websiteUrl} target="_blank" rel="noopener" className="text-accent hover:underline">
                      {new URL(app.websiteUrl).hostname.replace(/^www\./, "")}
                    </a>
                  </dd>
                </>
              )}
              {app.aliases.length > 0 && (
                <>
                  <dt className="text-muted">Also known as</dt>
                  <dd>{app.aliases.join(", ")}</dd>
                </>
              )}
            </dl>

            {app.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {app.categories.map((c) => (
                  <CategoryChip key={c.slug} category={c} />
                ))}
              </div>
            )}
            {app.tags.length > 0 && (
              <p className="mt-3 text-xs text-muted">Tags: {app.tags.map((t) => t.name).join(", ")}</p>
            )}

            <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-xs text-muted">
              {app.verification === "verified" ? (
                <>
                  <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                  Verified by an editor on {formatDate(app.lastVerifiedAt)}.
                </>
              ) : (
                <>
                  <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                  Not yet verified by an editor. Last updated {formatDate(app.updatedAt)}.
                </>
              )}
            </p>
          </section>

          <SideList title={`${s.name} is an alternative to`} apps={app.alternativeTo} />
          <SideList
            title="Similar software"
            apps={app.similar}
            href={category ? `/category/${category.slug}` : undefined}
          />
        </aside>
      </div>
    </Container>
  );
}
