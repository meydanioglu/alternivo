"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AuthApiError, userApi } from "@/lib/auth/session";

export async function markRefundedAction(entitlementId: string): Promise<{ error?: string }> {
  try {
    await userApi(`/api/v1/admin/payments/entitlements/${encodeURIComponent(entitlementId)}/refunded`, { method: "POST" });
  } catch (error) {
    return { error: error instanceof AuthApiError ? error.message : "İşlem yapılamadı." };
  }
  revalidateTag("sponsored", "max");
  revalidatePath("/admin/payments");
  return {};
}
