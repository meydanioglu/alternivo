import { ArrowRight, BadgeCheck, ExternalLink, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, site } from "@/config/site";
import { api } from "@/lib/api/client";
import type { ApplicationDetail, ApplicationSummary } from "@/lib/api/types";
import { formatDate, pricingLabel } from "@/lib/format";
import { loadOrNotFound } from "@/lib/resolve";
import { faqJsonLd, pageMetadata, softwareJsonLd } from "@/lib/seo";
import { AppFaq, buildAppFaq } from "@/components/catalog/app-faq";
import { AppContentSections } from "@/components/catalog/app-content";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { platformSummary } from "@/components/catalog/application-card";
import { pricingSummary, SoftwareListRow } from "@/components/catalog/software-row";
import { RatingSummary, ReviewCard } from "@/components/catalog/review-card";
import { ShareButton } from "@/components/catalog/share-button";
import { LikeSaveButtons, ReviewForm } from "@/components/catalog/community-actions";
import { getCurrentUser, userApi } from "@/lib/auth/session";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { SectionNav } from "@/components/layout/section-nav";
import { JsonLd } from "@/components/seo/json-ld";
import { outboundUrl } from "@/lib/outbound";
import { solutionsForCatalogSlug } from "@/lib/solutions";
import { buttonClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const load = (slug: string) => loadOrNotFound(() => api.application(slug), `/software/${slug}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await load(slug);
  const s = app.summary;
  return pageMetadata({
    title: app.seoTitle ?? `${s.name}: Features, Pricing & Alternatives`,
    description:
      app.seoDescription ??
      `${s.shortDescription} Compare ${s.name} pricing, platforms and license, and explore ${app.alternativesCount} alternatives.`.slice(0, 300),
    path: `/software/${s.slug}`,
    image: app.screenshots[0]?.url ?? null,
    noindex: app.indexable === false,
  });
}

/** Questions that differ only in wording ("Is X free?" / "Is X free to use?") are the same question. */
function sameQuestion(a: string, b: string) {
  const words = (q: string) => new Set(q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  const x = words(a);
  const y = words(b);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.max(1, Math.min(x.size, y.size)) >= 0.8;
}

function Facts({ app }: { app: ApplicationDetail }) {
  const s = app.summary;
  const rows: [string, React.ReactNode][] = [];
  if (app.developer) rows.push(["Developer", app.developer]);
  rows.push(["Pricing", s.pricing.length > 0 ? s.pricing.map(pricingLabel).join(", ") : <span className="text-muted">Not confirmed</span>]);
  if (s.license) rows.push(["License", s.license.name]);
  if (s.platforms.length > 0) rows.push(["Platforms", s.platforms.map((p) => p.name).join(", ")]);
  if (app.releasedOn) rows.push(["First released", formatDate(app.releasedOn)]);
  if (app.websiteUrl)
    rows.push([
      "Website",
      <a key="w" href={outboundUrl(app.websiteUrl)} target="_blank" rel="noopener" className="break-all text-accent hover:underline">
        {new URL(app.websiteUrl).hostname.replace(/^www\./, "")}
      </a>,
    ]);
  if (app.aliases.length > 0) rows.push(["Also known as", app.aliases.join(", ")]);
  if (app.categories.length > 0)
    rows.push([
      "Categories",
      <span key="c" className="flex flex-wrap gap-x-2 gap-y-1">
        {app.categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="hover:underline">
            {c.name}
          </Link>
        ))}
      </span>,
    ]);

  return (
    <section aria-labelledby="facts" className="rounded-[10px] border border-border bg-surface">
      <h2 id="facts" className="border-b border-border px-4 py-3 text-sm font-semibold">
        Product facts
      </h2>
      <dl className="divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
      {app.tags.length > 0 && (
        <p className="border-t border-border px-4 py-3 text-xs text-muted">Tags: {app.tags.map((t) => t.name).join(", ")}</p>
      )}
      <p className="flex items-start gap-1.5 border-t border-border px-4 py-3 text-xs text-muted">
        {app.verification === "verified" ? (
          <>
            <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
            Verified by an editor on {formatDate(app.lastVerifiedAt)}.
          </>
        ) : (
          <>Not yet verified by an editor. Last updated {formatDate(app.updatedAt)}.</>
        )}
      </p>
    </section>
  );
}

function RelatedList({ title, apps }: { title: string; apps: ApplicationSummary[] }) {
  if (apps.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface">
        {apps.slice(0, 6).map((a) => (
          <SoftwareListRow key={a.id} app={a} />
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
  // Approved editorial FAQ first, then data-driven answers that cover a different question.
  const editorialFaq = app.content?.faq ?? [];
  const faq = [...editorialFaq, ...buildAppFaq(app).filter((q) => !editorialFaq.some((e) => sameQuestion(e.question, q.question)))];
  const compareSlug = topAlternative ? [s.slug, topAlternative.slug].sort().join("-vs-") : null;
  const paragraphs = (app.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const price = pricingSummary(s);

  const user = await getCurrentUser();
  const [vote, bookmarks] = user
    ? await Promise.all([
        userApi<{ voted: boolean; count: number }>(`/api/v1/applications/${s.id}/votes`, { persist: false }).catch(() => null),
        userApi<ApplicationSummary[]>("/api/v1/users/me/bookmarks", { persist: false }).catch(() => []),
      ])
    : [null, []];

  const sections = [
    paragraphs.length > 0 && { id: "overview", label: "Overview" },
    (app.content?.features.length ?? 0) > 0 && { id: "features", label: "Features" },
    ((app.content?.pros.length ?? 0) > 0 || (app.content?.cons.length ?? 0) > 0) && { id: "pros-cons", label: "Pros & cons" },
    { id: "alternatives", label: "Alternatives" },
    faq.length > 0 && { id: "faq", label: "FAQ" },
    { id: "reviews", label: "Reviews" },
  ].filter((x): x is { id: string; label: string } => !!x);

  return (
    <>
      <JsonLd data={softwareJsonLd(app)} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <Container className="pt-6">
        <BreadcrumbNavigation
          items={[
            { name: "Home", path: "/" },
            ...(category ? [{ name: category.name, path: `/category/${category.slug}` }] : [{ name: "Software", path: "/software" }]),
            { name: s.name, path: `/software/${s.slug}` },
          ]}
        />

        <header className="mt-5 grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 gap-4 sm:gap-5">
            <ApplicationLogo name={s.name} logoUrl={s.logoUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {app.developer && <>by {app.developer}</>}
                {app.developer && category && <span className="mx-1.5">·</span>}
                {category && (
                  <Link href={`/category/${category.slug}`} className="hover:text-foreground hover:underline">
                    {category.name}
                  </Link>
                )}
              </p>
              <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-foreground/85">{s.shortDescription}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {price && <span className="font-medium text-foreground">{price}</span>}
                {s.license && <span>{s.license.name}</span>}
                {s.platforms.length > 0 && <span>{platformSummary(s.platforms, 4)}</span>}
                {app.verification === "verified" && (
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="size-3.5 text-success" aria-hidden="true" /> Verified
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-60">
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <Link href={`/software/${s.slug}/alternatives`} className={buttonClass("primary", "md", "lg:w-full")}>
                Find alternatives <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {app.websiteUrl && (
                <a href={outboundUrl(app.websiteUrl)} target="_blank" rel="noopener" className={buttonClass("outline", "md", "lg:w-full")}>
                  Visit website <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 lg:justify-center">
              <LikeSaveButtons
                applicationId={s.id}
                path={`/software/${s.slug}`}
                signedIn={!!user}
                liked={vote?.voted ?? false}
                likeCount={vote?.count ?? s.likeCount}
                saved={bookmarks.some((b) => b.id === s.id)}
              />
              <ShareButton title={`${s.name} on ${site.name}`} url={absoluteUrl(`/software/${s.slug}`)} />
            </div>
          </div>
        </header>
      </Container>

      <SectionNav sections={sections} />

      <Container className="pt-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-12">
            {app.screenshots.length > 0 && (
              <section aria-label={`${s.name} screenshots`}>
                <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                  {app.screenshots.map((shot) => (
                    <figure key={shot.url} className="w-full shrink-0 snap-start sm:w-[85%]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- first-party media with known dimensions */}
                      <img
                        src={shot.url}
                        alt={shot.caption ?? `${s.name} screenshot`}
                        width={shot.width || 1200}
                        height={shot.height || 630}
                        loading="lazy"
                        className="aspect-[1200/630] w-full rounded-[10px] border border-border bg-surface-secondary object-contain"
                      />
                      {shot.caption && <figcaption className="mt-1.5 text-xs text-muted">{shot.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {paragraphs.length > 0 && (
              <section id="overview" className="anchor-section">
                <h2 className="mb-3 text-lg font-semibold tracking-tight">About {s.name}</h2>
                <div className="prose-copy">
                  {paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {app.content && <AppContentSections name={s.name} content={app.content} />}

            <section id="alternatives" className="anchor-section">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Alternatives to {s.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">The closest matches by category, features and platforms.</p>
                </div>
                {app.alternativesCount > 0 && (
                  <Link href={`/software/${s.slug}/alternatives`} className="shrink-0 text-sm text-accent hover:underline">
                    View all {app.alternativesCount}
                  </Link>
                )}
              </div>
              {app.topAlternatives.length > 0 ? (
                <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface">
                  {app.topAlternatives.map((a) => (
                    <SoftwareListRow
                      key={a.id}
                      app={a}
                      trailing={
                        <Link
                          href={`/compare/${[s.slug, a.slug].sort().join("-vs-")}`}
                          className="relative z-10 hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-secondary hover:text-foreground sm:inline-flex"
                        >
                          <Scale className="size-3.5" aria-hidden="true" /> Compare
                        </Link>
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No alternatives have been mapped for {s.name} yet.</p>
              )}
              {compareSlug && topAlternative && (
                <p className="mt-3 text-sm">
                  <Link href={`/compare/${compareSlug}`} className="text-accent hover:underline">
                    Compare {s.name} with {topAlternative.name}
                  </Link>
                </p>
              )}
            </section>

            {solutionsForCatalogSlug(s.slug).length > 0 && (
              <section aria-labelledby="solutions-heading">
                <h2 id="solutions-heading" className="text-lg font-semibold tracking-tight">Problems {s.name} is checked for</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {solutionsForCatalogSlug(s.slug).map((p) => (
                    <li key={p.slug}><Link href={`/solutions/${p.slug}`} className="text-accent hover:underline">{p.title}</Link></li>
                  ))}
                </ul>
              </section>
            )}

            <AppFaq name={s.name} items={faq} />

            <section id="reviews" className="anchor-section">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight">Reviews</h2>
                {s.reviewCount > 0 && <RatingSummary average={s.ratingAverage} count={s.reviewCount} />}
              </div>
              {s.reviewCount === 0 && (
                <p className="mb-3 text-sm text-muted">Used {s.name}? Share what worked and what didn&apos;t to help others decide.</p>
              )}
              <ReviewForm applicationId={s.id} slug={s.slug} name={s.name} signedIn={!!user} />
              {app.recentReviews.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {app.recentReviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              )}
            </section>

            {(app.alternativeTo.length > 0 || app.similar.length > 0) && (
              <div className="grid gap-8 md:grid-cols-2">
                <RelatedList title={`${s.name} is an alternative to`} apps={app.alternativeTo} />
                <RelatedList title="Similar software" apps={app.similar} />
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Facts app={app} />
          </aside>
        </div>
      </Container>
    </>
  );
}
