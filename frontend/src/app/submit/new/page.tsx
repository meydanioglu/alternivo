import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/page-parts";
import { SubmitForm } from "@/components/submit/submit-form";
import { api } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Submit a product", robots: { index: false } };

const flatten = (items: Category[], prefix = ""): { slug: string; name: string }[] =>
  items.flatMap((c) => [{ slug: c.slug, name: prefix + c.name }, ...flatten(c.children ?? [], `${prefix}${c.name} › `)]);

export default async function NewSubmissionPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/submit/new");
  const [categories, platforms] = await Promise.all([api.categories(), api.platforms()]);

  return (
    <Container className="max-w-3xl py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Submit a product</h1>
      <p className="mb-8 mt-2 text-muted">
        Tell us about the product. The more detail you add, the faster it can be reviewed and the better it ranks as an
        alternative.
      </p>
      <SubmitForm
        categories={flatten(categories).sort((a, b) => a.name.localeCompare(b.name))}
        platforms={platforms.map((p) => ({ value: p.slug, label: p.name }))}
      />
    </Container>
  );
}
