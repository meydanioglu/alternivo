import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { LicenseBadge, PlatformList, PricingBadge } from "@/components/catalog/badges";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { BEST_PAGES, GROUP_LABELS, bestPage } from "@/content/best-pages";
import { guide } from "@/content/guides";
import { currentYear } from "@/lib/format";
import { loadBest } from "@/lib/keyword-pages";
import { faqJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";


type Props = { params: Promise<{ slug: string }> };

const titleOf = (title: string) => `${title} in ${currentYear()}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = bestPage(slug);
  if (!page) return {};
  const { apps, indexable } = await loadBest(page);
  const names = apps.slice(0, 3).map((a) => a.summary.name).join(", ");
  return pageMetadata({
    title: titleOf(page.title),
    description: `${page.intro.split(". ")[0]}. Compare ${apps.length} options${names ? ` including ${names}` : ""}: pricing, platforms and licences.`.slice(0, 300),
    path: `/best/${page.slug}`,
    noindex: !indexable,
  });
}

function faqFor(title: string, names: string[], criteria: string) {
  const lower = title.replace(/^Best /, "").toLowerCase();
  return [
    { question: `What are the ${title.toLowerCase()}?`, answer: `Popular options include ${names.slice(0, 5).join(", ")}. The right choice depends on your project, budget and how much control you need.` },
    { question: `How did you choose these ${lower}?`, answer: `${criteria} Paid placements never affect this list.` },
  ];
}

export default async function BestPageView({ params }: Props) {
  const { slug } = await params;
  const page = bestPage(slug);
  if (!page) notFound();
  const { apps } = await loadBest(page);
  const summaries = apps.map((a) => a.summary);
  const title = titleOf(page.title);
  const faq = summaries.length > 0 ? faqFor(page.title, summaries.map((s) => s.name), page.criteria) : [];
  const related = (page.related ?? [])
    .map((r) => bestPage(r) ? { href: `/best/${r}`, label: bestPage(r)!.title } : guide(r) ? { href: `/guides/${r}`, label: guide(r)!.title } : null)
    .filter((x): x is { href: string; label: string } => x !== null);
  const sameGroup = BEST_PAGES.filter((p) => p.group === page.group && p.slug !== page.slug && !(page.related ?? []).includes(p.slug)).slice(0, 8);

  return (
    <Container className="py-6">
      <JsonLd data={itemListJsonLd(title, summaries)} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          { name: "Best lists", path: "/best" },
          { name: page.title, path: `/best/${page.slug}` },
        ]}
      />
      <header className="mt-4 max-w-3xl">
        <p className="text-sm font-medium text-accent">{GROUP_LABELS[page.group]}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-foreground/80">{page.intro}</p>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-foreground">How we picked:</strong> {page.criteria} Listings are editorial and never paid.
        </p>
      </header>

      {summaries.length === 0 ? (
        <p className="mt-8 text-muted">We are still reviewing products for this list. Check back soon.</p>
      ) : (
        <ol className="mt-8 flex flex-col gap-3">
          {apps.map(({ summary: app, categories }, i) => (
            <li key={app.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start">
              <span className="w-6 shrink-0 text-lg font-bold tabular-nums text-muted">{i + 1}</span>
              <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">
                  <Link href={`/software/${app.slug}`} className="hover:underline">{app.name}</Link>
                </h2>
                {categories.length > 0 && <p className="text-xs text-muted">{categories.slice(0, 3).join(" · ")}</p>}
                <p className="mt-1 text-sm text-foreground/80">{app.shortDescription}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PricingBadge pricing={app.pricing} />
                  <LicenseBadge license={app.license} />
                </div>
                <PlatformList platforms={app.platforms} />
              </div>
              <div className="flex shrink-0 gap-2 text-sm sm:flex-col sm:items-end">
                <Link href={`/software/${app.slug}`} className="text-accent hover:underline">Details</Link>
                <Link href={`/software/${app.slug}/alternatives`} className="text-muted hover:text-foreground hover:underline">Alternatives</Link>
              </div>
            </li>
          ))}
        </ol>
      )}

      {faq.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold">FAQ</h2>
          <div className="flex flex-col gap-2">
            {faq.map((f) => (
              <details key={f.question} className="rounded-lg border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer font-medium">{f.question}</summary>
                <p className="mt-2 text-sm text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {(related.length > 0 || sameGroup.length > 0) && (
        <nav aria-label="Related" className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Related</h2>
          <ul className="flex flex-wrap gap-2">
            {[...related, ...sameGroup.map((p) => ({ href: `/best/${p.slug}`, label: p.title }))].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-accent/50">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Container>
  );
}
