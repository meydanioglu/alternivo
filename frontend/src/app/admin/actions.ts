"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const list = (form: FormData, name: string) => form.getAll(name).map(String).filter(Boolean);
const commaList = (value: string) => value.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);

function fail(error: unknown, fallback: string): FormState {
  if (error instanceof AuthApiError) {
    if (error.status === 401) return { error: "Oturumunuz sona erdi, tekrar giriş yapın." };
    if (error.status === 403) return { error: "Bu işlem için yetkiniz yok." };
    return { error: error.message || fallback };
  }
  return { error: fallback };
}

/** Fire-and-report helper for one-click actions (buttons outside forms). */
async function run(path: string, method: string, body?: unknown, revalidate = "/admin"): Promise<{ error?: string }> {
  try {
    await userApi(path, { method, body });
  } catch (error) {
    return { error: fail(error, "İşlem başarısız oldu.").error };
  }
  revalidatePath(revalidate, "layout");
  return {};
}

// ---------- Applications ----------

export async function saveApplicationAction(_: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const name = text(form, "name");
  const shortDescription = text(form, "shortDescription");
  if (!name || !shortDescription) return { error: "Ad ve kısa açıklama zorunlu." };
  const version = text(form, "version");
  const body = {
    name,
    slug: text(form, "slug") || null,
    shortDescription,
    description: text(form, "description") || null,
    websiteUrl: text(form, "websiteUrl") || null,
    logoUrl: text(form, "logoUrl"),
    developer: text(form, "developer") || null,
    pricing: list(form, "pricing"),
    licenseSlug: text(form, "licenseSlug") || null,
    isSelfHostable: form.get("isSelfHostable") === "on",
    isPrivacyFocused: form.get("isPrivacyFocused") === "on",
    hasOfflineSupport: form.get("hasOfflineSupport") === "on",
    editorialScore: Math.max(0, Math.min(100, Number(text(form, "editorialScore")) || 0)),
    releasedOn: text(form, "releasedOn") || null,
    primaryCategorySlug: text(form, "primaryCategorySlug") || null,
    categorySlugs: list(form, "categorySlugs"),
    platformSlugs: list(form, "platformSlugs"),
    featureSlugs: commaList(text(form, "featureSlugs")),
    tagSlugs: commaList(text(form, "tagSlugs")),
    aliases: commaList(text(form, "aliases")),
    markVerified: form.get("markVerified") === "on",
    version: version ? Number(version) : null,
  };

  let newId = id;
  try {
    if (id) {
      await userApi(`/api/v1/admin/applications/${id}`, { method: "PUT", body });
    } else {
      const created = await userApi<{ id: string }>("/api/v1/admin/applications", { method: "POST", body });
      newId = created.id;
    }
    if (form.get("publish") === "on") {
      await userApi(`/api/v1/admin/applications/${newId}/publish`, { method: "POST" });
    }
  } catch (error) {
    return fail(error, "Uygulama kaydedilemedi.");
  }
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/apps/${newId}?saved=1`);
  return { ok: "Kaydedildi." };
}

export async function setApplicationStatusAction(id: string, operation: "publish" | "unpublish" | "archive" | "delete") {
  return run(`/api/v1/admin/applications/${id}/${operation}`, "POST", undefined, "/");
}

// ---------- Moderation ----------

export async function decideAlternativeAction(id: string, decision: "approve" | "reject") {
  return run(`/api/v1/admin/alternatives/${id}/decision`, "POST", { decision, note: null });
}

export async function setReviewStatusAction(id: string, status: "published" | "pending" | "hidden") {
  return run(`/api/v1/admin/reviews/${id}/status`, "POST", { decision: status, note: null });
}

export async function resolveReportAction(id: string, decision: "resolve" | "dismiss") {
  return run(`/api/v1/admin/reports/${id}/decision`, "POST", { decision, note: null });
}

// ---------- Categories ----------

export async function saveCategoryAction(_: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const body = {
    name: text(form, "name"),
    slug: text(form, "slug") || null,
    description: text(form, "description") || null,
    parentSlug: text(form, "parentSlug") || null,
    icon: text(form, "icon") || null,
    isFeatured: form.get("isFeatured") === "on",
    sortOrder: Number(text(form, "sortOrder")) || 0,
  };
  if (!body.name) return { error: "Kategori adı zorunlu." };
  try {
    await userApi(id ? `/api/v1/admin/categories/${id}` : "/api/v1/admin/categories", { method: id ? "PUT" : "POST", body });
  } catch (error) {
    return fail(error, "Kategori kaydedilemedi.");
  }
  revalidatePath("/", "layout");
  return { ok: id ? "Kategori güncellendi." : "Kategori eklendi." };
}

export async function deleteCategoryAction(id: string) {
  return run(`/api/v1/admin/categories/${id}`, "DELETE", undefined, "/");
}

// ---------- Members ----------

export async function setMemberRolesAction(id: string, roles: string[]) {
  return run(`/api/v1/admin/members/${id}/roles`, "PUT", { roles });
}

export async function setMemberLockAction(id: string, locked: boolean) {
  return run(`/api/v1/admin/members/${id}/lock?locked=${locked}`, "POST");
}

// ---------- Redirects ----------

export async function createRedirectAction(_: FormState, form: FormData): Promise<FormState> {
  const fromPath = text(form, "fromPath");
  const toPath = text(form, "toPath") || null;
  const statusCode = Number(text(form, "statusCode")) || 301;
  try {
    await userApi("/api/v1/admin/redirects", { method: "POST", body: { fromPath, toPath, statusCode } });
  } catch (error) {
    return fail(error, "Yönlendirme eklenemedi.");
  }
  return { ok: `${fromPath} yönlendirmesi kaydedildi.` };
}
