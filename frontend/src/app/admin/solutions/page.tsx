import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-parts";
import { cx } from "@/components/ui/styles";
import { evaluatePage, solutionIndexable, topicPipeline } from "@/lib/solutions";

type Props = { searchParams: Promise<{ status?: string; category?: string; priority?: string }> };

const STATUS_LABEL: Record<string, string> = {
  candidate: "Aday",
  researching: "Araştırılıyor",
  draft: "Taslak",
  review: "İncelemede",
  published: "Yayında",
  rejected: "Reddedildi",
};

/**
 * Editorial pipeline for problem-based solution pages. Topics come from src/content/solutions/topics.json
 * (scripts/import-solution-topics.mjs); a page is published by adding it to src/content/solutions/pages.ts.
 */
export default async function AdminSolutionsPage({ searchParams }: Props) {
  const { status, category, priority } = await searchParams;
  const rows = topicPipeline();
  const categories = [...new Set(rows.map((r) => r.topic.category))];
  const shown = rows.filter((r) => (!status || r.status === status) && (!category || r.topic.category === category) && (!priority || r.topic.priority === priority));
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ status, category, priority, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/admin/solutions${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <AdminHeader
        title="Çözüm sayfaları"
        description={`${rows.length} konu adayı. Sayfa yalnızca araştırılmış verisi pages.ts içinde "published" olduğunda yayına girer; adaylar otomatik yayınlanmaz.`}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={link({ status: undefined })} className={cx("rounded-full border px-3 py-1", !status ? "border-accent text-foreground" : "border-border text-muted")}>Tümü {rows.length}</Link>
        {Object.entries(counts).map(([s, n]) => (
          <Link key={s} href={link({ status: s })} className={cx("rounded-full border px-3 py-1", status === s ? "border-accent text-foreground" : "border-border text-muted")}>
            {STATUS_LABEL[s] ?? s} {n}
          </Link>
        ))}
        {(["P1", "P2", "P3"] as const).map((p) => (
          <Link key={p} href={link({ priority: priority === p ? undefined : p })} className={cx("rounded-full border px-3 py-1", priority === p ? "border-accent text-foreground" : "border-border text-muted")}>{p}</Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {categories.map((c) => (
          <Link key={c} href={link({ category: category === c ? undefined : c })} className={category === c ? "font-medium text-accent" : "text-muted hover:text-foreground"}>{c}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-secondary text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Konu</th>
              <th className="px-3 py-2 font-medium">Kategori</th>
              <th className="px-3 py-2 font-medium">Öncelik</th>
              <th className="px-3 py-2 font-medium">Şablon</th>
              <th className="px-3 py-2 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ topic, page, status: s }) => {
              const evaluations = page ? evaluatePage(page) : [];
              const recommended = evaluations.filter((e) => e.verdict === "recommended").length;
              return (
                <tr key={topic.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    {page?.status === "published" ? (
                      <Link href={`/solutions/${page.slug}`} className="font-medium hover:underline">{topic.title}</Link>
                    ) : (
                      <span className="font-medium">{topic.title}</span>
                    )}
                    <span className="block text-xs text-muted">/solutions/{topic.slug}</span>
                    {page && (
                      <span className="block text-xs text-muted">
                        {evaluations.length} ürün incelendi, {recommended} öneriliyor · {solutionIndexable(page, evaluations) ? "indexlenebilir" : "noindex (veri eksik)"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{topic.category}</td>
                  <td className="px-3 py-2">{topic.priority}</td>
                  <td className="px-3 py-2 text-muted">{topic.template}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[s] ?? s}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
