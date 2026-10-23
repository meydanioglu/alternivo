import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setApplicationStatusAction } from "@/app/admin/actions";
import { AdminHeader } from "@/components/admin/admin-parts";
import { ActionButton } from "@/components/admin/admin-ui";
import { type AppDetail, AppEditor } from "@/components/admin/app-editor";
import { buttonClass } from "@/components/ui/styles";
import { api } from "@/lib/api/client";
import { AuthApiError, userApi } from "@/lib/auth/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditAppPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const isNew = id === "new";

  const [app, categories, platforms] = await Promise.all([
    isNew
      ? null
      : userApi<AppDetail>(`/api/v1/admin/applications/${id}`, { persist: false }).catch((e: unknown) => {
          if (e instanceof AuthApiError && (e.status === 404 || e.status === 400)) return undefined;
          throw e;
        }),
    userApi<{ slug: string; name: string }[]>("/api/v1/admin/categories", { persist: false }),
    api.platforms(),
  ]);
  if (app === undefined) notFound();

  return (
    <>
      <AdminHeader
        title={app ? app.name : "Yeni uygulama"}
        description={app ? `Durum: ${app.status === "Published" ? "Yayında" : app.status === "Draft" ? "Taslak" : "Arşiv"}` : "Kataloğa elle uygulama ekleyin."}
        action={
          app && (
            <div className="flex flex-wrap gap-2">
              {app.status === "Published" && (
                <Link href={`/software/${app.slug}`} target="_blank" className={buttonClass("outline", "sm")}>
                  Sitede gör <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              )}
              {app.status === "Published" ? (
                <ActionButton action={setApplicationStatusAction.bind(null, app.id, "unpublish")}>Yayından kaldır</ActionButton>
              ) : (
                <ActionButton action={setApplicationStatusAction.bind(null, app.id, "publish")} variant="primary">
                  Yayınla
                </ActionButton>
              )}
              <ActionButton action={setApplicationStatusAction.bind(null, app.id, "archive")} variant="ghost">
                Arşivle
              </ActionButton>
            </div>
          )
        }
      />
      {saved && (
        <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Uygulama oluşturuldu.
        </p>
      )}
      <AppEditor
        key={app ? `${app.id}-${app.version}` : "new"}
        app={app}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        platforms={platforms.map((p) => ({ slug: p.slug, name: p.name }))}
      />
    </>
  );
}
