"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi } from "@/lib/auth/session";

const message = (error: unknown, fallback: string) =>
  error instanceof AuthApiError ? (error.status === 403 ? "Bu ayarı yalnızca Admin ve Süper admin değiştirebilir." : error.message) : fallback;

export async function saveAiSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const apiKey = String(form.get("apiKey") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  try {
    // An empty key field means "keep the current key"; removal has its own button.
    await userApi("/api/v1/admin/settings/ai", { method: "PUT", body: { apiKey: apiKey || null, model } });
  } catch (error) {
    return { error: message(error, "Kaydedilemedi.") };
  }
  revalidatePath("/admin", "layout");
  return { ok: apiKey ? "API anahtarı şifreli olarak kaydedildi." : "Model kaydedildi." };
}

export async function removeAiKeyAction(): Promise<{ error?: string }> {
  try {
    await userApi("/api/v1/admin/settings/ai", { method: "PUT", body: { apiKey: "", model: null } });
  } catch (error) {
    return { error: message(error, "Silinemedi.") };
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function testAiAction(): Promise<{ ok: boolean; message: string }> {
  try {
    return await userApi<{ ok: boolean; message: string }>("/api/v1/admin/settings/ai/test", { method: "POST" });
  } catch (error) {
    return { ok: false, message: message(error, "Test yapılamadı.") };
  }
}

export async function saveIntegrationsAction(_: FormState, form: FormData): Promise<FormState> {
  const value = (name: string) => String(form.get(name) ?? "").trim();
  // Plain fields are saved as typed (empty clears them); empty secret fields keep the stored secret.
  const keys = ["fastReview", "featured", "growth", "homepageSpotlight", "categorySponsorship", "competitorSponsorship", "alternativeCard"];
  const prices: Record<string, number> = {};
  for (const k of keys) {
    const raw = value(`price_${k}`).replace(",", ".");
    // Empty disables the plan (0); otherwise convert the typed amount to minor units.
    const amount = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return { error: `Geçersiz fiyat: ${k}` };
    prices[k] = Math.round(amount * 100);
  }
  const body = {
    payTrMerchantId: value("payTrMerchantId"),
    payTrMerchantKey: value("payTrMerchantKey") || null,
    payTrMerchantSalt: value("payTrMerchantSalt") || null,
    payTrTestMode: form.get("payTrTestMode") === "on",
    payTrCurrency: value("payTrCurrency") || "TL",
    prices,
    googleClientId: value("googleClientId"),
    googleClientSecret: value("googleClientSecret") || null,
    paymentProvider: value("paymentProvider") || "paytr",
    lemonStoreId: value("lemonStoreId"),
    lemonApiKey: value("lemonApiKey") || null,
    lemonWebhookSecret: value("lemonWebhookSecret") || null,
    lemonTestMode: form.get("lemonTestMode") === "on",
    smtpHost: value("smtpHost"),
    smtpPort: value("smtpPort"),
    smtpUsername: value("smtpUsername"),
    smtpPassword: value("smtpPassword") || null,
    smtpFrom: value("smtpFrom"),
  };
  try {
    await userApi("/api/v1/admin/settings/integrations", { method: "PUT", body });
  } catch (error) {
    return { error: message(error, "Kaydedilemedi.") };
  }
  revalidatePath("/", "layout");
  return { ok: "Entegrasyon ayarları kaydedildi." };
}
