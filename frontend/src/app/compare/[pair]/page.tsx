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
  const title = `${names(data.applications)}: Features, Pricing & Platforms Compared`;
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

export default async function ComparePairPage({ params }: Props) {
  const { pair } = await params;
  const data = await load(pair);
  const apps = data.applications;
  const allPlatforms = [...new Map(apps.flatMap((a) => a.summary.platforms).map((p) => [p.slug, p])).values()];

  const rows: { label: string; render: (a: CompareApplication) => ReactNode }[] = [
    { label: "Developer", render: (a) => a.developer ?? "—" },
    { label: "Pricing", render: (a) => a.summary.pricing.map(pricingLabel).join(", ") || "Unknown" },
    { label: "License", render: (a) => a.summary.license?.name ?? "Unknown" },
    { label: "Open source", render: (a) => yesNo(a.summary.isOpenSource, "Open source") },
    { label: "Self-hostable", render: (a) => yesNo(a.summary.isSelfHostable, "Self-hostable") },
    { label: "Works offline", render: (a) => yesNo(a.summary.hasOfflineSupport, "Works offline") },
    { label: "Privacy-focused", render: (a) => yesNo(a.summary.isPrivacyFocused, "Privacy-focused") },
    ...allPlatforms.map((p) => ({
      label: p.name,
      render: (a: CompareApplication) => yesNo(a.summary.platforms.some((x) => x.slug === p.slug), p.name),
    })),
    {
      label: "Community rating",
      render: (a) =>
        a.summary.reviewCount > 0 && a.summary.ratingAverage !== null
          ? `${a.summary.ratingAverage.toFixed(1)} / 5 (${a.summary.reviewCount} reviews)`
          : "No reviews yet",
    },
    { label: "Likes", render: (a) => String(a.summary.likeCount) },
    { label: "First released", render: (a) => formatDate(a.releasedOn) ?? "—" },
    { label: "Categories", render: (a) => a.categories.map((c) => c.name).join(", ") || "—" },
  ];

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
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{names(apps)}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        A side-by-side comparison built from catalogue data.
        {data.sharedFeatures.length > 0
          ? ` Both offer ${data.sharedFeatures.length} of the same listed features, including ${data.sharedFeatures.slice(0, 3).join(", ")}.`
          : " They share no listed features."}
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="sr-only">Comparison of {names(apps)}</caption>
          <thead>
            <tr className="bg-surface">
              <th scope="col" className="sticky left-0 z-10 w-44 bg-surface p-3 text-left font-medium text-muted">
                App
              </th>
              {apps.map((a) => (
                <th key={a.summary.slug} scope="col" className="p-3 text-left align-top">
                  <div className="flex items-center gap-3">
                    <ApplicationLogo name={a.summary.name} logoUrl={a.summary.logoUrl} />
                    <div>
                      <Link href={`/software/${a.summary.slug}`} className="text-base font-semibold hover:underline">
                        {a.summary.name}
                      </Link>
                      <p className="line-clamp-2 text-xs font-normal text-muted">{a.summary.shortDescription}</p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <th scope="row" className="sticky left-0 z-10 bg-background p-3 text-left font-medium text-muted">
                  {row.label}
                </th>
                {apps.map((a) => (
                  <td key={a.summary.slug} className="p-3 align-top">
                    {row.render(a)}
                  </td>
                ))}
              </tr>
            ))}
            {data.featureMatrix.length > 0 && (
              <tr className="border-t border-border bg-surface">
                <th scope="rowgroup" colSpan={apps.length + 1} className="p-3 text-left font-semibold">
                  Features
                </th>
              </tr>
            )}
            {data.featureMatrix.map((f) => (
              <tr key={f.slug} className="border-t border-border">
                <th scope="row" className="sticky left-0 z-10 bg-background p-3 text-left font-normal">
                  {f.name}
                </th>
                {apps.map((a) => (
                  <td key={a.summary.slug} className="p-3">
                    {listed(f.presentIn.includes(a.summary.slug), f.name)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border">
              <th scope="row" className="sticky left-0 z-10 bg-background p-3 text-left font-medium text-muted">
                Links
              </th>
              {apps.map((a) => (
                <td key={a.summary.slug} className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/software/${a.summary.slug}/alternatives`} className={buttonClass("secondary", "sm")}>
                      Alternatives
                    </Link>
                    {a.websiteUrl && (
                      <a href={a.websiteUrl} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")}>
                        Website <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Feature rows list only features recorded in the catalogue. A missing check means the feature is not recorded for
        that app, not necessarily that it is unavailable.
      </p>
    </Container>
  );
}
