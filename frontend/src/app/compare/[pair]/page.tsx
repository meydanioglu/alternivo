import { canonicalPair } from "@/content/keyword-targets";
import { Check, ExternalLink, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api/client";
import type { CompareApplication } from "@/lib/api/types";
import { formatDate, pricingLabel } from "@/lib/format";
import { loadOrNotFound } from "@/lib/resolve";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClass } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pair: string }> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validates the pair and redirects reversed orderings to the single canonical URL. */
async function load(pair: string) {
  const slugs = pair.split("-vs-");
  if (slugs.length !== 2 || slugs.some((s) => !SLUG.test(s)) || slugs[0] === slugs[1]) notFound();
  // Keyword-plan names (e.g. make-com, godot) resolve to catalog slugs.
  const canonical = canonicalPair(slugs[0]!, slugs[1]!);
  if (canonical !== pair) permanentRedirect(`/compare/${canonical}`);
  return loadOrNotFound(() => api.compare(pair), `/compare/${pair}`);
}

const names = (apps: CompareApplication[]) => apps.map((a) => a.summary.name).join(" vs ");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const data = await load(pair);
  // Short enough to show in full in results ("A vs B" is also how people search).
  const title = `${names(data.applications)}: Which Is Better?`;
  return pageMetadata({
    title,
    description: `${names(data.applications)} side by side: pricing, license, supported platforms, self-hosting and ${data.featureMatrix.length} features compared.`,
    path: `/compare/${data.canonicalSlug}`,
    noindex: !data.isIndexable,
  });
}

function Yes({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}: </span>Yes
    </span>
  );
}

function No({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <Minus className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}: </span>No
    </span>
  );
}

const yesNo = (value: boolean, label: string) => (value ? <Yes label={label} /> : <No label={label} />);

/** Feature cells distinguish "recorded" from "not recorded" rather than claiming absence. */
const listed = (value: boolean, label: string) =>
  value ? (
    <Yes label={label} />
  ) : (
    <span className="text-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}: not recorded</span>
    </span>
  );

type Row = { label: string; render: (a: CompareApplication) => ReactNode; show?: boolean };

/**
 * Differences that are actually recorded for one product and not the other, phrased as reasons to pick it.
 * Built only from catalogue attributes, so nothing here is an opinion or a guess.
 */
function reasonsToChoose(app: CompareApplication, other: CompareApplication, features: { name: string; presentIn: string[] }[]) {
  const a = app.summary;
  const b = other.summary;
  const out: string[] = [];
  const free = (x: typeof a) => x.pricing.includes("free") || x.pricing.includes("freemium");
  if (free(a) && !free(b)) out.push(`You want a free option or free plan (${b.name} has none recorded)`);
  if (a.isOpenSource && !b.isOpenSource) out.push("You prefer open-source software");
  if (a.isSelfHostable && !b.isSelfHostable) out.push("You want to host it on your own servers");
  if (a.hasOfflineSupport && !b.hasOfflineSupport) out.push("You need it to work offline");
  if (a.isPrivacyFocused && !b.isPrivacyFocused) out.push("Privacy is a priority");
  const onlyPlatforms = a.platforms.filter((p) => !b.platforms.some((q) => q.slug === p.slug)).map((p) => p.name);
  if (onlyPlatforms.length > 0) out.push(`You use ${onlyPlatforms.join(", ")}`);
  const onlyFeatures = features.filter((f) => f.presentIn.includes(a.slug) && !f.presentIn.includes(b.slug)).map((f) => f.name);
  if (onlyFeatures.length > 0) out.push(`You need ${onlyFeatures.slice(0, 3).join(", ")}`);
  return out;
}

export default async function ComparePairPage({ params }: Props) {
  const { pair } = await params;
  const data = await load(pair);
  const apps = data.applications;
  const allPlatforms = [...new Map(apps.flatMap((a) => a.summary.platforms).map((p) => [p.slug, p])).values()];
  const anyReviews = apps.some((a) => a.summary.reviewCount > 0);
  const anyReleased = apps.some((a) => a.releasedOn);

  const groupDefs: { title: string; rows: Row[] }[] = [
    {
      title: "Overview",
      rows: [
        { label: "Developer", render: (a) => a.developer ?? <span className="text-muted">Not listed</span>, show: apps.some((a) => a.developer) },
        { label: "Pricing", render: (a) => a.summary.pricing.map(pricingLabel).join(", ") || <span className="text-muted">Not confirmed</span> },
        { label: "License", render: (a) => a.summary.license?.name ?? <span className="text-muted">Not listed</span> },
        { label: "Categories", render: (a) => a.categories.map((c) => c.name).join(", ") || "—" },
        { label: "First released", render: (a) => formatDate(a.releasedOn) ?? "—", show: anyReleased },
        {
          label: "Community rating",
          render: (a) =>
            a.summary.reviewCount > 0 && a.summary.ratingAverage !== null
              ? `${a.summary.ratingAverage.toFixed(1)} / 5 (${a.summary.reviewCount} reviews)`
              : <span className="text-muted">No reviews</span>,
          show: anyReviews,
        },
      ],
    },
    {
      title: "Ownership & privacy",
      rows: [
        { label: "Open source", render: (a) => yesNo(a.summary.isOpenSource, "Open source") },
        { label: "Self-hostable", render: (a) => yesNo(a.summary.isSelfHostable, "Self-hostable") },
        { label: "Works offline", render: (a) => yesNo(a.summary.hasOfflineSupport, "Works offline") },
        { label: "Privacy-focused", render: (a) => yesNo(a.summary.isPrivacyFocused, "Privacy-focused") },
      ],
    },
    {
      title: "Platforms",
      rows: allPlatforms.map((p) => ({
        label: p.name,
        render: (a: CompareApplication) => yesNo(a.summary.platforms.some((x) => x.slug === p.slug), p.name),
      })),
    },
    {
      title: "Features",
      rows: data.featureMatrix.map((f) => ({
        label: f.name,
        render: (a: CompareApplication) => listed(f.presentIn.includes(a.summary.slug), f.name),
      })),
    },
  ];
  const groups = groupDefs.map((g) => ({ ...g, rows: g.rows.filter((r) => r.show !== false) })).filter((g) => g.rows.length > 0);

  const choose = apps.length === 2
    ? apps.map((a, i) => ({ app: a, reasons: reasonsToChoose(a, apps[1 - i]!, data.featureMatrix) }))
    : [];

  return (
    <Container className="py-6">
      <JsonLd data={itemListJsonLd(names(apps), apps.map((a) => a.summary))} />
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: names(apps), path: `/compare/${data.canonicalSlug}` },
        ]}
      />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">{names(apps)}</h1>
      <p className="mt-2 max-w-3xl text-[15px] text-muted">
        A side-by-side comparison built from catalogue data.
        {data.sharedFeatures.length > 0
          ? ` Both offer ${data.sharedFeatures.length} of the same listed features, including ${data.sharedFeatures.slice(0, 3).join(", ")}.`
          : ""}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {apps.map((a) => (
          <div key={a.summary.slug} className="flex flex-col rounded-[10px] border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <ApplicationLogo name={a.summary.name} logoUrl={a.summary.logoUrl} />
              <div className="min-w-0">
                <h2 className="font-semibold">
                  <Link href={`/software/${a.summary.slug}`} className="hover:underline">
                    {a.summary.name}
                  </Link>
                </h2>
                <p className="text-xs text-muted">
                  {[a.categories[0]?.name, a.summary.pricing.map(pricingLabel).join(", ")].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm text-foreground/80">{a.summary.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/software/${a.summary.slug}`} className={buttonClass("outline", "sm")}>
                Details
              </Link>
              <Link href={`/software/${a.summary.slug}/alternatives`} className={buttonClass("ghost", "sm")}>
                Alternatives
              </Link>
              {a.websiteUrl && (
                <a href={a.websiteUrl} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")}>
                  Website <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {choose.some((c) => c.reasons.length > 0) && (
        <section className="mt-10" aria-labelledby="choose">
          <h2 id="choose" className="mb-1 text-lg font-semibold tracking-tight">Which should you choose?</h2>
          <p className="mb-4 text-sm text-muted">Based on recorded differences only — there is no universal winner.</p>
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {choose.map(({ app, reasons }) => (
              <div key={app.summary.slug}>
                <h3 className="font-medium">Choose {app.summary.name} if…</h3>
                {reasons.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1.5 text-[15px] text-foreground/85">
                    {reasons.map((r) => (
                      <li key={r} className="flex gap-2.5">
                        <span className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">No recorded advantage over the other product.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="table">
        <h2 id="table" className="mb-4 text-lg font-semibold tracking-tight">Side-by-side</h2>
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
          <table className="w-full border-collapse text-sm sm:min-w-[32rem]">
            <caption className="sr-only">Comparison of {names(apps)}</caption>
            <thead>
              <tr className="border-b border-border">
                <td className="sticky left-0 z-10 w-28 bg-surface p-3 sm:w-40" />
                {apps.map((a) => (
                  <th key={a.summary.slug} scope="col" className="p-3 text-left font-semibold">
                    <span className="flex items-center gap-2">
                      <ApplicationLogo name={a.summary.name} logoUrl={a.summary.logoUrl} size="sm" />
                      {a.summary.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr className="bg-surface-secondary/60">
                  <th scope="rowgroup" colSpan={apps.length + 1} className="eyebrow px-3 py-2 text-left">
                    {g.title}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="sticky left-0 z-10 bg-surface p-3 text-left font-normal text-muted">
                      {row.label}
                    </th>
                    {apps.map((a) => (
                      <td key={a.summary.slug} className="p-3 align-top">
                        {row.render(a)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Feature rows list only features recorded in the catalogue. A dash means the feature is not recorded for that
          app, not necessarily that it is unavailable.
        </p>
      </section>
    </Container>
  );
}
