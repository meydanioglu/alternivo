"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { AuthApiError, userApi, userUpload } from "@/lib/auth/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

function fail(error: unknown, fallback: string): FormState {
  if (error instanceof AuthApiError) {
    if (error.status === 401) return { error: "Your session has expired. Please sign in again." };
    return { error: error.message || fallback };
  }
  return { error: fallback };
}

async function patchMe(body: Record<string, unknown>, ok: string, fallback: string): Promise<FormState> {
  try {
    await userApi("/api/v1/users/me", { method: "PATCH", body });
  } catch (error) {
    return fail(error, fallback);
  }
  revalidatePath("/", "layout");
  return { ok };
}

export async function saveProfileAction(_: FormState, form: FormData): Promise<FormState> {
  return patchMe(
    { displayName: text(form, "displayName"), username: text(form, "username"), bio: text(form, "bio") },
    "Profile saved.",
    "Could not save your profile.",
  );
}

export async function saveLinksAction(_: FormState, form: FormData): Promise<FormState> {
  return patchMe(
    { website: text(form, "website"), twitter: text(form, "twitter"), gitHub: text(form, "gitHub"), linkedIn: text(form, "linkedIn") },
    "Links saved.",
    "Could not save your links.",
  );
}

export async function savePrivacyAction(_: FormState, form: FormData): Promise<FormState> {
  return patchMe(
    { isProfilePublic: form.get("isProfilePublic") === "on", showLikes: form.get("showLikes") === "on" },
    "Privacy settings saved.",
    "Could not save your privacy settings.",
  );
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const oldPassword = String(form.get("oldPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  if (newPassword !== String(form.get("confirmPassword") ?? "")) return { fieldErrors: { confirmPassword: "Passwords do not match." } };
  if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return { fieldErrors: { newPassword: "At least 10 characters, with an uppercase letter, a lowercase letter and a number." } };
  }
  try {
    await userApi("/api/v1/auth/manage/info", { method: "POST", body: { oldPassword, newPassword } });
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 400) return { fieldErrors: { oldPassword: "Current password is incorrect." } };
    return fail(error, "Could not change your password.");
  }
  return { ok: "Password changed." };
}

export async function uploadAvatarAction(form: FormData): Promise<{ error?: string; avatarUrl?: string }> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first." };
  if (file.size > 1024 * 1024) return { error: "Image must be 1 MB or smaller." };
  const upload = new FormData();
  upload.set("file", file, file.name);
  try {
    const result = await userUpload<{ avatarUrl: string }>("/api/v1/users/me/avatar", upload);
    revalidatePath("/", "layout");
    return { avatarUrl: result.avatarUrl };
  } catch (error) {
    return { error: fail(error, "Upload failed.").error };
  }
}

export async function removeAvatarAction(): Promise<{ error?: string }> {
  try {
    await userApi("/api/v1/users/me/avatar", { method: "DELETE" });
  } catch (error) {
    return { error: fail(error, "Could not remove the avatar.").error };
  }
  revalidatePath("/", "layout");
  return {};
}
