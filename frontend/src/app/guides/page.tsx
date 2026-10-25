import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { GUIDES } from "@/content/guides";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Guides: building apps and games with AI",
  description: "Step-by-step guides to building games, mobile apps and SaaS products with AI, choosing tools and exporting your code.",
  path: "/guides",
});

export default function GuidesIndexPage() {
  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Guides</h1>
      <p className="mt-2 max-w-2xl text-muted">Practical, tool-neutral guides for building with AI.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="block h-full rounded-xl border border-border bg-surface p-4 hover:border-accent/50">
              <h2 className="font-semibold">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
