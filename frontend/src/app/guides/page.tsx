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
      <header className="mb-8 mt-5 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Guides</h1>
        <p className="mt-2 text-[15px] text-muted">Practical, tool-neutral guides for building with AI.</p>
      </header>
      <ul className="max-w-3xl divide-y divide-border border-y border-border">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group block py-4">
              <h2 className="font-medium group-hover:underline">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
