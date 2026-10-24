"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

export async function decideCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("id") ?? "");
  // The default submit button (Onayla) sends no "decision" value.
  const decision = String(form.get("decision") ?? "") || "approve";
  const note = String(form.get("note") ?? "").trim() || null;
  try {
    await userApi(`/api/v1/admin/campaigns/${encodeURIComponent(id)}/decision`, { method: "POST", body: { decision, note } });
  } catch (error) {
    return { error: error instanceof AuthApiError ? error.message : "İşlem yapılamadı." };
  }
  revalidateTag("sponsored", "max");
  revalidatePath("/admin/campaigns");
  return { ok: "Kaydedildi." };
}
