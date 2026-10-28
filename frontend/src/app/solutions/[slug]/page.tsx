import { Check, CircleHelp, ExternalLink, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { cx } from "@/components/ui/styles";
import { absoluteUrl } from "@/config/site";
import { publishedSolutions, solutionPage } from "@/content/solutions/pages";
import type { Fact } from "@/content/solutions/types";
import { currentYear, formatDate } from "@/lib/format";
import { outboundUrl } from "@/lib/outbound";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { type CheckResult, type Evaluation, evaluatePage, solutionIndexable, topicOf } from "@/lib/solutions";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => publishedSolutions().map((p) => ({ slug: p.slug }));

const titleOf = (title: string) => `${title} (${currentYear()})`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = solutionPage((await params).slug);
  if (!page) return {};
  return pageMetadata({ title: titleOf(page.title), description: page.description, path: `/solutions/${page.slug}`, noindex: !solutionIndexable(page) });
}

const VERDICT = {
  recommended: { label: "Meets your requirements", className: "text-success" },
  "needs-verification": { label: "Not verified for your requirements", className: "text-warning" },
  excluded: { label: "Does not meet your requirements", className: "text-danger" },
} as const;

function FactCell({ fact }: { fact: Fact | undefined }) {
  const value = fact?.value;
  const [Icon, label, color] =
    value === true ? [Check, "Yes", "text-success"] : value === false ? [X, "No", "text-danger"] : [CircleHelp, "Not verified", "text-muted"];
  return (
    <span className={cx("inline-flex items-center gap-1", color)} title={fact?.detail}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="text-foreground/80">{label}</span>
    </span>
  );
}

const CHECK_ICON: Record<CheckResult, typeof Check> = { met: Check, "not-met": X, unverified: CircleHelp };

function ProductCard({ e, rank }: { e: Evaluation; rank: number | null }) {
  const p = e.product;
  const href = outboundUrl(p.affiliateUrl ?? p.website);
  return (
    <article id={p.id} className="rounded-[10px] border border-border bg-surface p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {rank !== null && <span className="mr-2 text-muted tabular-nums">{rank}.</span>}
          {p.catalogSlug ? <Link href={`/software/${p.catalogSlug}`} className="hover:underline">{p.name}</Link> : p.name}
        </h3>
        <span className={cx("text-sm font-medium", VERDICT[e.verdict].className)}>{VERDICT[e.verdict].label}</span>
      </header>
      <p className="text-xs text-muted">{p.kind}{p.bestFor && ` · Best for: ${p.bestFor}`}</p>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {e.checks.map((c) => {
          const Icon = CHECK_ICON[c.result];
          return (
            <li key={c.requirement.fact} className="flex gap-2">
              <Icon className={cx("mt-0.5 size-4 shrink-0", c.result === "met" ? "text-success" : c.result === "not-met" ? "text-danger" : "text-muted")} aria-hidden="true" />
              <span>
                {c.requirement.label}
                {c.result === "unverified" && <span className="text-muted"> — not verified</span>}
                {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {p.pricing && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Fees: </span>{p.pricing.summary}{" "}
          <a href={p.pricing.source} rel="nofollow noopener" target="_blank" className="text-xs text-muted underline">source</a>
        </p>
      )}
      {(p.pros.length > 0 || p.cons.length > 0) && (
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {p.pros.length > 0 && (
            <div>
              <p className="font-medium">Pros</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/80">{p.pros.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          {p.cons.length > 0 && (
            <div>
              <p className="font-medium">Cons</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/80">{p.cons.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 flex flex-wrap gap-4 text-sm">
        <a href={href} rel={p.affiliateUrl ? "sponsored noopener" : "nofollow noopener"} target="_blank" className="inline-flex items-center gap-1 text-accent hover:underline">
          Visit {p.name} <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        {p.catalogSlug && <Link href={`/software/${p.catalogSlug}/alternatives`} className="text-muted hover:text-foreground hover:underline">{p.name} alternatives</Link>}
      </p>
    </article>
  );
}

export default async function SolutionPageView({ params }: Props) {
  const page = solutionPage((await params).slug);
  if (!page) notFound();
  const evaluations = evaluatePage(page);
  const recommended = evaluations.filter((e) => e.verdict === "recommended");
  const others = evaluations.filter((e) => e.verdict !== "recommended");
  const topic = topicOf(page);
  const title = titleOf(page.title);
  const sources = [...new Map(evaluations.flatMap((e) => [
    ...Object.values(e.product.facts).filter((f) => f.source).map((f) => [f.source!, { name: e.product.name, url: f.source!, verified: f.verified }] as const),
    ...(e.product.pricing ? [[e.product.pricing.source, { name: e.product.name, url: e.product.pricing.source, verified: e.product.pricing.verified }] as const] : []),
  ])).values()];
  const related = publishedSolutions().filter((p) => p.slug !== page.slug && (page.related?.includes(p.slug) || topicOf(p)?.category === topic?.category)).slice(0, 6);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Solutions", path: "/solutions" },
    { name: page.title, path: `/solutions/${page.slug}` },
  ];

  return (
    <Container className="py-6">
      <JsonLd data={faqJsonLd(page.faqs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          itemListElement: recommended.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.product.name, url: e.product.catalogSlug ? absoluteUrl(`/software/${e.product.catalogSlug}`) : e.product.website })),
        }}
      />
      <BreadcrumbNavigation items={crumbs} />
      <header className="mt-5 max-w-3xl">
        {topic && <p className="eyebrow">{topic.category}</p>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="prose-copy mt-3">{page.intro}</p>
        <p className="mt-2 text-xs text-muted">Last verified {formatDate(page.updated)}</p>
      </header>

      <section className="mt-6 max-w-3xl rounded-[10px] border border-accent/40 bg-accent-soft px-5 py-4">
        <h2 className="font-semibold">Short answer</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">{page.answer}</p>
      </section>

      <section className="mt-6 max-w-3xl text-sm">
        <h2 className="font-semibold">What we checked</h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {page.requirements.map((r) => (
            <li key={r.fact} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />{r.label}{r.hard ? "" : " (preferred)"}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          A product is recommended only when its official pages confirm every required item. Missing information is shown as &quot;not verified&quot;, never as yes. Paid placements do not affect this page.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Comparison</h2>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-secondary text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Provider</th>
                {page.columns.map((c) => <th key={c.fact} className="px-4 py-2 font-medium">{c.label}</th>)}
                <th className="px-4 py-2 font-medium">Fees</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={e.product.id} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-2 font-medium"><a href={`#${e.product.id}`} className="hover:underline">{e.product.name}</a></th>
                  {page.columns.map((c) => <td key={c.fact} className="px-4 py-2"><FactCell fact={e.product.facts[c.fact]} /></td>)}
                  <td className="px-4 py-2 text-foreground/80">{e.product.pricing?.summary ?? <span className="text-muted">Not verified</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Recommended options</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">{recommended.map((e, i) => <ProductCard key={e.product.id} e={e} rank={i + 1} />)}</div>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Checked but not recommended</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">{others.map((e) => <ProductCard key={e.product.id} e={e} rank={null} />)}</div>
        </section>
      )}

      {page.limitations.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight">Limitations to know</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-foreground/85">{page.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      )}

      <section className="mt-10 max-w-3xl">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="divide-y divide-border border-y border-border">
          {page.faqs.map((f) => (
            <div key={f.question} className="py-4">
              <h3 className="font-medium">{f.question}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 max-w-3xl text-sm">
        <h2 className="font-semibold">Sources</h2>
        <ul className="mt-2 space-y-1 text-muted">
          {sources.map((s) => (
            <li key={s.url}>
              {s.name}: <a href={s.url} rel="nofollow noopener" target="_blank" className="break-all underline">{s.url}</a>
              {s.verified && <> (checked {formatDate(s.verified)})</>}
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <nav aria-label="Related solutions" className="mt-12 border-t border-border pt-8">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Related solutions</h2>
          <ul className="grid gap-x-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <li key={p.slug}><Link href={`/solutions/${p.slug}`} className="block py-1.5 text-foreground/80 hover:text-foreground">{p.title}</Link></li>)}
          </ul>
        </nav>
      )}
    </Container>
  );
}
