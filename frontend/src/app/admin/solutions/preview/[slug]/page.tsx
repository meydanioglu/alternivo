import { notFound } from "next/navigation";
import { SolutionView } from "@/components/solutions/solution-view";
import { SOLUTION_PAGES } from "@/content/solutions/pages";
import { solutionIndexable } from "@/lib/solutions";

type Props = { params: Promise<{ slug: string }> };

/** Staff-only preview of a solution page in any status (the admin layout checks the role and sets noindex). */
export default async function SolutionPreviewPage({ params }: Props) {
  const { slug } = await params;
  const page = SOLUTION_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <>
      <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        Önizleme · durum: <strong>{page.status}</strong> · {solutionIndexable(page) ? "yayınlanınca indekslenebilir" : "yayınlansa da noindex kalır (kaynak/fiyat eksik)"}.
        Yayına almak için pages.ts içinde status değerini &quot;published&quot; yapın.
      </p>
      <SolutionView page={page} />
    </>
  );
}
