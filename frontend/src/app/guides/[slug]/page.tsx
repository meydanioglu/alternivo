import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, site } from "@/config/site";
import { bestPage } from "@/content/best-pages";
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

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const g = guide(slug);
  if (!g) notFound();
  const tools = await loadApps(g.tools ?? []);
  const lists = g.bestLinks.map(bestPage).filter((p) => p !== undefined);
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
      <article className="mx-auto mt-4 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{g.title}</h1>
        <p className="mt-1 text-sm text-muted">Updated {new Date(g.updated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <p className="mt-4 text-lg text-foreground/80">{g.intro}</p>

        <div className="mt-8 flex flex-col gap-8 leading-7 text-foreground/85">
          {g.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-xl font-semibold text-foreground">{s.heading}</h2>
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
                  <Link href={`/software/${app.slug}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-accent/50">
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
                  <Link href={`/best/${p!.slug}`} className="inline-block rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-accent/50">
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
    </Container>
  );
}
