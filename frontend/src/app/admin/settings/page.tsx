import { Sparkles } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-parts";
import { type AiSettingsView, AiSettingsForm } from "@/components/admin/ai-settings-form";
import { EmptyState } from "@/components/layout/page-parts";
import { AuthApiError, userApi } from "@/lib/auth/session";

export default async function AdminSettingsPage() {
  const view = await userApi<AiSettingsView>("/api/v1/admin/settings/ai", { persist: false }).catch((e: unknown) => {
    if (e instanceof AuthApiError && e.status === 403) return null;
    throw e;
  });

  return (
    <>
      <AdminHeader title="Ayarlar" description="Site genelindeki entegrasyonlar." />
      {!view ? (
        <EmptyState title="Yetkiniz yok">Ayarları yalnızca Admin ve Süper admin görebilir.</EmptyState>
      ) : (
        <section className="max-w-2xl rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-accent" aria-hidden="true" /> Yapay zekâ içerik üretimi (OpenAI)
          </h2>
          <p className="mb-5 text-sm text-muted">İçerik sayfasındaki ürün metinleri bu anahtar ve modelle yazılır. Ücretler OpenAI hesabınıza yansır.</p>
          <AiSettingsForm view={view} />
        </section>
      )}
    </>
  );
}
