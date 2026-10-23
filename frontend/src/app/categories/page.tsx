import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { CategoryIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Software Categories",
  description: "Browse software by category: AI tools, productivity, design, developer tools, security, business and more.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const tree = await api.categories();
  const visible = tree.filter((c) => c.applicationCount > 0);

  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Categories", path: "/categories" }]} />
      <h1 className="mb-6 mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Software categories</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category) => (
          <section key={category.slug} className="rounded-lg border border-border bg-surface p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CategoryIcon name={category.icon} className="size-5 text-accent" />
              <Link href={`/category/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>
              <span className="ml-auto text-xs font-normal tabular-nums text-muted">{category.applicationCount}</span>
            </h2>
            {category.description && <p className="mt-1 text-sm text-muted">{category.description}</p>}
            {category.children.some((c) => c.applicationCount > 0) && (
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {category.children
                  .filter((c) => c.applicationCount > 0)
                  .map((child) => (
                    <li key={child.slug} className="flex justify-between">
                      <Link href={`/category/${child.slug}`} className="hover:text-accent hover:underline">
                        {child.name}
                      </Link>
                      <span className="tabular-nums text-muted">{child.applicationCount}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Container>
  );
}
