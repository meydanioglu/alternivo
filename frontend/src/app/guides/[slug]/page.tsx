import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, site } from "@/config/site";
import { bestPage, resolveBestSlugs } from "@/content/best-pages";
import { GUIDES, guide } from "@/content/guides";
import { loadApps } from "@/lib/keyword-pages";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";


type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = guide(slug);
  if (!g) return {};
  return pageMetadata({ title: g.title, description: g.description, path: `/guides/${g.slug}`, type: "article" });
}

const anchor = (heading: string) =>
  heading.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const g = guide(slug);
  if (!g) notFound();
  const tools = await loadApps(g.tools ?? []);
  const lists = resolveBestSlugs(g.bestLinks).map(bestPage).filter((p) => p !== undefined);
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 6);

  return (
    <Container className="py-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          dateModified: g.updated,
          mainEntityOfPage: absoluteUrl(`/guides/${g.slug}`),
          author: { "@type": "Organization", name: site.name, url: site.url },
          publisher: { "@type": "Organization", name: site.name, url: site.url },
        }}
      />
      <BreadcrumbNavigation
        items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: g.title, path: `/guides/${g.slug}` },
        ]}
      />
      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,45rem)_14rem] lg:justify-between">
      <article className="min-w-0">
        <p className="eyebrow">Guide · Updated {new Date(g.updated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{g.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-foreground/80">{g.intro}</p>

        <div className="mt-10 flex flex-col gap-10 text-[16px] leading-7 text-foreground/85">
          {g.sections.map((s) => (
            <section key={s.heading} id={anchor(s.heading)} className="anchor-section">
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">{s.heading}</h2>
              {s.body.map((p) => <p key={p} className="mt-2">{p}</p>)}
              {s.steps && (
                <ol className="mt-3 list-decimal space-y-1 pl-6">
                  {s.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              )}
            </section>
          ))}
        </div>

        {tools.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xl font-semibold">Tools mentioned</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {tools.map(({ summary: app }) => (
                <li key={app.id}>
                  <Link href={`/software/${app.slug}`} className="flex items-center gap-3 rounded-[10px] border border-border bg-surface p-3 hover:border-foreground/20">
                    <ApplicationLogo name={app.name} logoUrl={app.logoUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-medium">{app.name}</span>
                      <span className="block truncate text-xs text-muted">{app.shortDescription}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lists.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xl font-semibold">Compare tools for this</h2>
            <ul className="flex flex-wrap gap-2">
              {lists.map((p) => (
                <li key={p!.slug}>
                  <Link href={`/best/${p!.slug}`} className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:border-foreground/20">
                    {p!.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">More guides</h2>
          <ul className="flex flex-col gap-1">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/guides/${o.slug}`} className="text-accent hover:underline">{o.title}</Link></li>
            ))}
          </ul>
        </section>
      </article>
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-24">
          <p className="eyebrow mb-2">On this page</p>
          <ul className="flex flex-col gap-1.5 border-l border-border text-sm">
            {g.sections.map((s) => (
              <li key={s.heading}>
                <a href={`#${anchor(s.heading)}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-foreground/40 hover:text-foreground">
                  {s.heading.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      </div>
    </Container>
  );
}
