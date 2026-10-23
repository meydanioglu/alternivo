import type { DirectoryCategory } from "@/components/catalog/category-directory";
import type { Category } from "@/lib/api/types";

/** Every category in the tree as one flat, alphabetical list (empty categories included). */
export function flattenCategories(tree: Category[]): DirectoryCategory[] {
  const out: DirectoryCategory[] = [];
  const walk = (items: Category[]) => {
    for (const c of items) {
      out.push({ slug: c.slug, name: c.name, count: c.applicationCount });
      walk(c.children ?? []);
    }
  };
  walk(tree);
  return out.sort((a, b) => a.name.localeCompare(b.name, "en"));
}
