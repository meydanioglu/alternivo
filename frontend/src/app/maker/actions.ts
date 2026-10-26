"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { AGREEMENT_VERSION } from "@/config/business";
import { startCheckout } from "@/lib/auth/checkout";
import { AuthApiError, userApi } from "@/lib/auth/session";

const errorText = (error: unknown, fallback: string) => (error instanceof AuthApiError ? error.message : fallback);

export async function assignEntitlementAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("entitlementId") ?? "");
  const targetId = String(form.get("targetId") ?? "");
  if (!id || !targetId) return { error: "Choose a target first." };
  try {
    await userApi(`/api/v1/maker/entitlements/${encodeURIComponent(id)}/assign`, { method: "POST", body: { targetId } });
  } catch (error) {
    return { error: errorText(error, "Could not apply the purchase.") };
  }
  revalidatePath("/maker");
  return { ok: "Purchase applied." };
}

/** Server-validated checkout: the API checks ownership/eligibility and price, then we open the PayTR payment page. */
export async function checkoutAction(_: FormState, form: FormData): Promise<FormState> {
  const plan = String(form.get("plan") ?? "");
  const targetId = String(form.get("targetId") ?? "") || null;
  let url: string;
  try {
    url = await startCheckout(plan, targetId);
  } catch (error) {
    return { error: errorText(error, "Checkout is not available right now.") };
  }
  redirect(url);
}

export async function createCampaignAction(_: FormState, form: FormData): Promise<FormState> {
  const plan = String(form.get("plan") ?? "");
  const applicationId = String(form.get("applicationId") ?? "");
  const target = String(form.get(plan === "categorySponsorship" ? "category" : "competitor") ?? "").trim().toLowerCase() || null;
  const startsAt = String(form.get("startsAt") ?? "");
  if (!applicationId) return { error: "Choose the product to promote." };
  let url: string;
  try {
    const { id } = await userApi<{ id: string }>("/api/v1/maker/campaigns", {
      method: "POST",
      body: { applicationId, planKey: plan, targetSlug: plan === "homepageSpotlight" ? null : target, startsAt: startsAt ? `${startsAt}T00:00:00Z` : null },
    });
    url = await startCheckout(plan, id);
  } catch (error) {
    revalidatePath("/maker");
    return { error: errorText(error, "Could not reserve this placement.") };
  }
  redirect(url);
}

export async function cancelCampaignAction(id: string): Promise<{ error?: string }> {
  try {
    await userApi(`/api/v1/maker/campaigns/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  } catch (error) {
    return { error: errorText(error, "Could not cancel.") };
  }
  revalidatePath("/maker");
  return {};
}

/** Records the buyer's confirmation of the pre-contract information and agreement, then shows the payment form. */
export async function acceptTermsAction(_: FormState, form: FormData): Promise<FormState> {
  const orderId = String(form.get("orderId") ?? "");
  if (form.get("agreement") !== "on" || form.get("immediate") !== "on") {
    return { error: "Please tick both boxes to continue." };
  }
  try {
    await userApi(`/api/v1/maker/orders/${encodeURIComponent(orderId)}/accept-terms`, { method: "POST", body: { version: AGREEMENT_VERSION } });
  } catch (error) {
    return { error: errorText(error, "Could not confirm the order. Please start again from your dashboard.") };
  }
  redirect(`/maker/pay/${encodeURIComponent(orderId)}`);
}
