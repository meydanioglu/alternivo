"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

const message = (error: unknown, fallback: string) =>
  error instanceof AuthApiError ? (error.status === 403 ? "Bu işlem için Editör veya Admin yetkisi gerekir." : error.message) : fallback;

export async function queueImportsAction(_: FormState, form: FormData): Promise<FormState> {
  const lines = String(form.get("lines") ?? "");
  if (!lines.trim()) return { error: "En az bir adres girin." };
  try {
    const r = await userApi<{ queued: number; duplicates: number; invalid: string[] }>("/api/v1/admin/imports", {
      method: "POST",
      body: { lines, categorySlug: String(form.get("categorySlug") ?? "") || null },
    });
    revalidatePath("/admin/imports");
    const parts = [`${r.queued} ürün kuyruğa eklendi.`];
    if (r.duplicates) parts.push(`${r.duplicates} adres zaten listede olduğu için atlandı.`);
    if (r.invalid.length) parts.push(`${r.invalid.length} satır geçersiz: ${r.invalid.slice(0, 3).join(" · ")}`);
    return { ok: parts.join(" ") };
  } catch (error) {
    return { error: message(error, "Kuyruğa eklenemedi.") };
  }
}

async function run(path: string, method = "POST"): Promise<{ error?: string; count?: number }> {
  try {
    const r = await userApi<{ count?: number } | null>(path, { method });
    revalidatePath("/admin/imports");
    return { count: r?.count };
  } catch (error) {
    return { error: message(error, "İşlem başarısız oldu.") };
  }
}

export async function requeueAction(scope: "failed" | "all") {
  return run(`/api/v1/admin/imports/requeue?scope=${scope}`);
}
export async function requeueOneAction(id: string) {
  return run(`/api/v1/admin/imports/${id}/requeue`);
}
export async function deleteImportAction(id: string) {
  return run(`/api/v1/admin/imports/${id}`, "DELETE");
}
export async function publishDraftsAction() {
  return run("/api/v1/admin/imports/publish-drafts");
}
