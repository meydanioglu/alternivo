"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

export async function assignEntitlementAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("entitlementId") ?? "");
  const targetId = String(form.get("targetId") ?? "");
  if (!id || !targetId) return { error: "Choose a product first." };
  try {
    await userApi(`/api/v1/maker/entitlements/${encodeURIComponent(id)}/assign`, { method: "POST", body: { targetId } });
  } catch (error) {
    return { error: error instanceof AuthApiError ? error.message : "Could not apply the boost." };
  }
  revalidatePath("/maker");
  return { ok: "Boost applied." };
}
