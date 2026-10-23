"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

const message = (error: unknown, fallback: string) =>
  error instanceof AuthApiError ? (error.status === 403 ? "Bu işlem için Editör veya Admin yetkisi gerekir." : error.message) : fallback;

async function run(path: string, body?: unknown): Promise<{ error?: string; count?: number }> {
  try {
    const r = await userApi<{ count?: number } | null>(path, { method: "POST", body });
    revalidatePath("/admin/content", "layout");
    return { count: r?.count };
  } catch (error) {
    return { error: message(error, "İşlem başarısız oldu.") };
  }
}

export async function queueContentAction(scope: "missing" | "all") {
  return run("/api/v1/admin/content/queue", { scope, applicationIds: null });
}
export async function retryFailedContentAction() {
  return run("/api/v1/admin/content/retry-failed");
}
export async function cancelQueuedContentAction() {
  return run("/api/v1/admin/content/cancel-queued");
}
export async function regenerateContentAction(id: string) {
  return run(`/api/v1/admin/content/${id}/regenerate`);
}
export async function rejectContentAction(id: string) {
  return run(`/api/v1/admin/content/${id}/reject`);
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** "Name: description" per line. */
const features = (v: FormDataEntryValue | null) =>
  lines(v).map((l) => {
    const i = l.indexOf(":");
    return i > 0 ? { name: l.slice(0, i).trim(), description: l.slice(i + 1).trim() } : { name: l, description: "" };
  });

/** Blocks separated by a blank line: first line is the question, the rest the answer. */
const faq = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((b) => b.length >= 2 && (b[0] ?? "").trim())
    .map(([q = "", ...a]) => ({ question: q.trim(), answer: a.join(" ").trim() }));

export async function approveContentAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("id"));
  const next = String(form.get("next") ?? "");
  try {
    await userApi(`/api/v1/admin/content/${id}/approve`, {
      method: "POST",
      body: {
        shortDescription: String(form.get("shortDescription") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        seoTitle: String(form.get("seoTitle") ?? "").trim() || null,
        seoDescription: String(form.get("seoDescription") ?? "").trim() || null,
        publish: form.get("publish") === "on",
        sections: {
          features: features(form.get("features")),
          useCases: lines(form.get("useCases")),
          audience: lines(form.get("audience")),
          pros: lines(form.get("pros")),
          cons: lines(form.get("cons")),
          faq: faq(form.get("faq")),
        },
      },
    });
  } catch (error) {
    return { error: message(error, "Onaylanamadı.") };
  }
  revalidatePath("/", "layout");
  redirect(next ? `/admin/content/${next}?approved=1` : "/admin/content?status=ready&approved=1");
}
