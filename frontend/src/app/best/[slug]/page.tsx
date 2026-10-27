import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { platformSummary } from "@/components/catalog/application-card";
import { pricingSummary } from "@/components/catalog/software-row";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { BEST_PAGES, GROUP_LABELS, bestPage } from "@/content/best-pages";
import { guide } from "@/content/guides";
import { currentYear } from "@/lib/format";
import { loadBest, requiresFree } from "@/lib/keyword-pages";
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
  const criteria = requiresFree(page) ? `${page.criteria} Only products with a confirmed free plan, free use or open-source license are included.` : page.criteria;
  const faq = summaries.length > 0 ? faqFor(page.title, summaries.map((s) => s.name), criteria) : [];
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
      <header className="mt-5 max-w-3xl">
        <p className="eyebrow">{GROUP_LABELS[page.group]}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="prose-copy mt-3">{page.intro}</p>
      </header>
      <aside className="mt-5 max-w-3xl rounded-[10px] border border-border bg-surface px-4 py-3 text-sm">
        <p>
          <span className="font-medium">How we picked: </span>
          <span className="text-foreground/80">{page.criteria}{requiresFree(page) && " Only products whose free plan, free use or open-source license is confirmed in our data are listed."}</span>
        </p>
        <p className="mt-1 text-xs text-muted">Editorial list based on each product&apos;s official information. Paid placements never appear here.</p>
      </aside>

      {summaries.length === 0 ? (
        <p className="mt-8 text-muted">We are still reviewing products for this list. Check back soon.</p>
      ) : (
        <ol className="mt-8 divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface">
          {apps.map(({ summary: app, categories }, i) => {
            const meta = [pricingSummary(app), app.license?.name, app.platforms.length > 0 ? platformSummary(app.platforms, 4) : null].filter(Boolean);
            return (
              <li key={app.id} className="flex gap-4 p-4 sm:p-5">
                <span className="hidden w-5 pt-2.5 text-right text-sm tabular-nums text-muted sm:block">{i + 1}</span>
                <ApplicationLogo name={app.name} logoUrl={app.logoUrl} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold sm:text-lg">
                    <Link href={`/software/${app.slug}`} className="hover:underline">{app.name}</Link>
                  </h2>
                  <p className="text-xs text-muted">{[categories[0], ...meta].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1.5 text-[15px] text-foreground/85">{app.shortDescription}</p>
                  <p className="mt-2 flex gap-4 text-sm">
                    <Link href={`/software/${app.slug}`} className="text-accent hover:underline">Details</Link>
                    <Link href={`/software/${app.slug}/alternatives`} className="text-muted hover:text-foreground hover:underline">Alternatives</Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {faq.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="divide-y divide-border border-y border-border">
            {faq.map((f) => (
              <div key={f.question} className="py-4">
                <h3 className="font-medium">{f.question}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(related.length > 0 || sameGroup.length > 0) && (
        <nav aria-label="Related" className="mt-12 border-t border-border pt-8">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Related lists and guides</h2>
          <ul className="grid gap-x-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[...related, ...sameGroup.map((p) => ({ href: `/best/${p.slug}`, label: p.title }))].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-1.5 text-foreground/80 hover:text-foreground">
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
