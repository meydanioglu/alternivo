"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const list = (form: FormData, name: string) => form.getAll(name).map(String).filter(Boolean);
const commaList = (v: string) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const message = (error: unknown, fallback: string) =>
  error instanceof AuthApiError ? (error.status === 403 ? "Bu işlem için Moderatör veya Admin yetkisi gerekir." : error.message) : fallback;

function body(form: FormData) {
  return {
    name: text(form, "name"),
    websiteUrl: text(form, "websiteUrl"),
    description: text(form, "description"),
    categorySlug: text(form, "categorySlug") || null,
    pricing: list(form, "pricing"),
    licenseSlug: text(form, "licenseSlug") || null,
    platforms: list(form, "platforms"),
    tags: commaList(text(form, "tags")),
    screenshotUrls: [],
    suggestedAlternatives: commaList(text(form, "alternatives")),
  };
}

/** Saves the moderator's edits, then applies the decision chosen with the submit button. */
export async function reviewSubmissionAction(_: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const decision = text(form, "decision");
  if (!["save", "approve", "needs-changes", "reject"].includes(decision)) return { error: "Bilinmeyen işlem." };
  try {
    if (form.get("editable") === "1") {
      await userApi(`/api/v1/admin/submissions/${id}`, { method: "PUT", body: body(form) });
    }
    if (decision !== "save") {
      await userApi(`/api/v1/admin/submissions/${id}/decision`, {
        method: "POST",
        body: { decision, note: text(form, "note") || null },
      });
    }
  } catch (error) {
    return { error: message(error, "Kaydedilemedi.") };
  }
  revalidatePath("/", "layout");
  if (decision === "save") return { ok: "Değişiklikler kaydedildi." };
  redirect(`/admin/submissions?done=${decision}`);
}
