import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbNavigation, Container } from "@/components/layout/page-parts";
import { CategoryIcon } from "@/components/ui/icons";
import { CategoryDirectory } from "@/components/catalog/category-directory";
import { flattenCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Software Categories",
  description: "Browse software by category: AI tools, productivity, design, developer tools, security, business and more.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const tree = await api.categories();
  const all = flattenCategories(tree);
  const groups = tree.filter((c) => c.applicationCount > 0 && c.children.some((x) => x.applicationCount > 0));

  return (
    <Container className="py-6">
      <BreadcrumbNavigation items={[{ name: "Home", path: "/" }, { name: "Categories", path: "/categories" }]} />
      <header className="mb-10 mt-5 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Software categories</h1>
        <p className="mt-2 text-[15px] text-muted">
          {all.filter((c) => c.count > 0).length} categories with listed products, from AI agents to password managers. Search or
          browse by group.
        </p>
      </header>

      {groups.length > 0 && (
        <section aria-labelledby="groups" className="mb-14">
          <h2 id="groups" className="mb-5 text-lg font-semibold tracking-tight">Browse by group</h2>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <section key={group.slug}>
                <h3 className="flex items-center gap-2 border-b border-border pb-2 font-medium">
                  <CategoryIcon name={group.icon} className="size-4 text-muted" />
                  <Link href={`/category/${group.slug}`} className="hover:underline">
                    {group.name}
                  </Link>
                  <span className="ml-auto text-xs font-normal tabular-nums text-muted">{group.applicationCount}</span>
                </h3>
                <ul className="mt-2 flex flex-col text-sm">
                  {group.children
                    .filter((c) => c.applicationCount > 0)
                    .slice(0, 8)
                    .map((child) => (
                      <li key={child.slug}>
                        <Link href={`/category/${child.slug}`} className="flex justify-between gap-3 py-1 text-foreground/80 hover:text-foreground">
                          <span className="truncate">{child.name}</span>
                          <span className="tabular-nums text-muted">{child.applicationCount}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all">
        <h2 id="all" className="mb-3 text-lg font-semibold tracking-tight">All categories</h2>
        <CategoryDirectory categories={all} />
      </section>
    </Container>
  );
}
