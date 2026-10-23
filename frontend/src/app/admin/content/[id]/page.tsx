import { ArrowLeft, CircleAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import { regenerateContentAction, rejectContentAction } from "@/app/admin/content/actions";
import { AdminHeader } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { ContentReviewForm, type Sections } from "@/components/admin/content-review";
import { ApplicationLogo } from "@/components/catalog/application-logo";
import { buttonClass } from "@/components/ui/styles";
import { userApi } from "@/lib/auth/session";

interface Detail {
  id: string;
  applicationId: string;
  applicationName: string;
  applicationSlug: string;
  logoUrl: string | null;
  status: string;
  error: string | null;
  currentShortDescription: string | null;
  currentDescription: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Sections | null;
  sourceUrl: string | null;
  sourceChars: number;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ approved?: string }> };

const EMPTY: Sections = { features: [], useCases: [], audience: [], pros: [], cons: [], faq: [] };

export default async function ContentReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { approved } = await searchParams;
  const [d, queue] = await Promise.all([
    userApi<Detail>(`/api/v1/admin/content/${id}`, { persist: false }),
    userApi<{ items: { items: { id: string }[] } }>("/api/v1/admin/content?status=ready&page=1", { persist: false }),
  ]);
  const nextId = queue.items.items.map((x) => x.id).find((x) => x !== id) ?? null;

  return (
    <>
      <Link href="/admin/content" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> İçerik listesi
      </Link>
      {approved && (
        <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Önceki içerik onaylandı. Sıradaki taslak açıldı.
        </p>
      )}
      <AdminHeader
        title={d.applicationName}
        description={`Durum: ${d.status} · ${d.model ?? "—"} · ${d.inputTokens + d.outputTokens} token`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/software/${d.applicationSlug}`} target="_blank" className={buttonClass("outline", "sm")}>
              Sitede gör <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <ActionButton action={regenerateContentAction.bind(null, d.id)} confirm="Bu ürün için içerik yeniden yazılsın mı?">
              Yeniden üret
            </ActionButton>
            {d.status === "Ready" && (
              <ActionButton action={rejectContentAction.bind(null, d.id)} variant="ghost" className="text-danger">
                Reddet
              </ActionButton>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        <ApplicationLogo name={d.applicationName} logoUrl={d.logoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p>
            Kaynak:{" "}
            {d.sourceUrl ? (
              <a href={d.sourceUrl} target="_blank" rel="noopener nofollow" className="text-accent hover:underline">
                {d.sourceUrl}
              </a>
            ) : (
              "—"
            )}{" "}
            <span className="text-muted">({d.sourceChars.toLocaleString("tr-TR")} karakter metin)</span>
          </p>
          {d.error && (
            <p className="mt-1 flex items-start gap-1 text-warning">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {d.error}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Model yalnızca kaynak metindeki bilgileri kullanacak şekilde yönlendirildi. Yine de fiyat, özellik ve iddiaları onaylamadan önce kontrol edin.
          </p>
        </div>
      </div>

      <details className="mb-5 rounded-xl border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium">Şu an sitedeki metin</summary>
        <p className="mt-3 font-medium">{d.currentShortDescription}</p>
        <p className="mt-2 whitespace-pre-line text-muted">{d.currentDescription ?? "—"}</p>
      </details>

      <ContentReviewForm
        key={d.id}
        id={d.id}
        nextId={nextId}
        canApprove={d.status !== "Queued" && d.status !== "Generating" && d.status !== "Failed"}
        draft={{
          shortDescription: d.shortDescription ?? "",
          description: d.description ?? "",
          seoTitle: d.seoTitle ?? "",
          seoDescription: d.seoDescription ?? "",
          sections: d.sections ?? EMPTY,
        }}
      />
    </>
  );
}
