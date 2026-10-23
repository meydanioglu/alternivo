"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthApiError, authPost, clearTokens, login, userApi } from "@/lib/auth/session";

export interface FormState {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string>;
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const list = (form: FormData, name: string) =>
  form.getAll(name).map(String).map((v) => v.trim()).filter(Boolean);
const commaList = (value: string) =>
  value.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);

/** Only same-site relative paths are allowed as post-login destinations. */
const safeNext = (value: string) => (value.startsWith("/") && !value.startsWith("//") ? value : "/account");

function failure(error: unknown, fallback: string): FormState {
  if (error instanceof AuthApiError) {
    if (error.status === 401 || error.status === 403) return { error: "Please sign in again to continue." };
    if (error.status === 429) return { error: "Too many attempts. Please wait a few minutes and try again." };
    return { error: error.message || fallback };
  }
  return { error: fallback };
}

// ---------- Account ----------

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your e-mail and password." };
  try {
    await login(email, password);
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      return { error: "E-mail or password is incorrect, or the account is not confirmed yet." };
    }
    return failure(error, "Sign-in failed. Please try again.");
  }
  redirect(safeNext(text(form, "next")));
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const displayName = text(form, "displayName");
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  if (displayName.length < 2 || displayName.length > 60) fieldErrors.displayName = "Use 2–60 characters.";
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Enter a valid e-mail address.";
  if (password.length < 10) fieldErrors.password = "Use at least 10 characters.";
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    fieldErrors.password = "Include an uppercase letter, a lowercase letter and a number.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await authPost("register", { email, password });
  } catch (error) {
    if (error instanceof AuthApiError && Object.keys(error.errors).some((k) => k.includes("Duplicate"))) {
      return { fieldErrors: { email: "An account with this e-mail already exists." } };
    }
    return failure(error, "Registration failed. Please try again.");
  }

  try {
    await login(email, password);
  } catch {
    return { ok: "Account created. Check your inbox to confirm your e-mail, then sign in." };
  }
  try {
    await userApi("/api/v1/users/me", { method: "PATCH", body: { displayName } });
  } catch {
    // The account works without a display name; it can be set later on the account page.
  }
  redirect(safeNext(text(form, "next")));
}

export async function logoutAction() {
  await clearTokens();
  redirect("/");
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await userApi("/api/v1/users/me", {
      method: "PATCH",
      body: { displayName: text(form, "displayName"), bio: text(form, "bio") },
    });
  } catch (error) {
    return failure(error, "Could not save your profile.");
  }
  revalidatePath("/account");
  return { ok: "Profile saved." };
}

// ---------- Submissions ----------

export async function submitProductAction(_: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  const websiteUrl = text(form, "websiteUrl");
  const tagline = text(form, "tagline");
  const description = text(form, "description");
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter the product name.";
  if (!/^https?:\/\/\S+\.\S+/.test(websiteUrl)) fieldErrors.websiteUrl = "Enter the full website address, starting with https://";
  if (tagline.length < 10 || tagline.length > 120) fieldErrors.tagline = "Use 10–120 characters.";
  if (description.length < 30) fieldErrors.description = "Describe the product in at least 30 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // The first line of the description becomes the short description on approval.
  const fullDescription = `${tagline}\n\n${description}`.slice(0, 3000);
  try {
    await userApi("/api/v1/submissions", {
      method: "POST",
      body: {
        name,
        websiteUrl,
        description: fullDescription,
        categorySlug: text(form, "category") || null,
        pricing: list(form, "pricing"),
        licenseSlug: text(form, "license") || null,
        platforms: list(form, "platforms"),
        tags: commaList(text(form, "tags")).slice(0, 15),
        screenshotUrls: [],
        suggestedAlternatives: commaList(text(form, "alternatives")).map((s) => s.toLowerCase()).slice(0, 10),
      },
    });
  } catch (error) {
    return failure(error, "Your submission could not be sent. Please check the fields and try again.");
  }
  redirect("/account?submitted=1");
}

// ---------- Community actions on an application ----------

export async function setLikeAction(applicationId: string, like: boolean) {
  try {
    return await userApi<{ voted: boolean; count: number }>(`/api/v1/applications/${applicationId}/votes`, {
      method: like ? "PUT" : "DELETE",
    });
  } catch (error) {
    return { error: failure(error, "Could not save your like.").error };
  }
}

export async function setBookmarkAction(applicationId: string, save: boolean) {
  try {
    await userApi(`/api/v1/applications/${applicationId}/bookmark`, { method: save ? "PUT" : "DELETE" });
    revalidatePath("/account");
    return { saved: save };
  } catch (error) {
    return { error: failure(error, "Could not update your saved apps.").error };
  }
}

export async function setAlternativeVoteAction(relationshipId: string, vote: boolean) {
  try {
    return await userApi<{ voted: boolean; count: number }>(`/api/v1/alternatives/${relationshipId}/votes`, {
      method: vote ? "PUT" : "DELETE",
    });
  } catch (error) {
    return { error: failure(error, "Could not save your vote.").error };
  }
}

export async function createReviewAction(_: FormState, form: FormData): Promise<FormState> {
  const applicationId = text(form, "applicationId");
  const slug = text(form, "slug");
  const rating = Number(form.get("rating"));
  const title = text(form, "title");
  const body = text(form, "body");
  const fieldErrors: Record<string, string> = {};
  if (!(rating >= 1 && rating <= 5)) fieldErrors.rating = "Choose a rating.";
  if (title.length < 3) fieldErrors.title = "Add a short title.";
  if (body.length < 30) fieldErrors.body = "Write at least 30 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  try {
    await userApi(`/api/v1/applications/${applicationId}/reviews`, {
      method: "POST",
      body: { rating, title, body, pros: text(form, "pros") || null, cons: text(form, "cons") || null },
    });
  } catch (error) {
    return failure(error, "Your review could not be posted.");
  }
  revalidatePath(`/software/${slug}`);
  return { ok: "Thanks! Your review has been submitted and will appear after moderation." };
}

export async function suggestAlternativeAction(_: FormState, form: FormData): Promise<FormState> {
  const slug = text(form, "slug");
  const alternativeSlug = text(form, "alternativeSlug").toLowerCase();
  if (!alternativeSlug) return { fieldErrors: { alternativeSlug: "Choose an application." } };
  try {
    await userApi(`/api/v1/applications/${encodeURIComponent(slug)}/alternatives`, {
      method: "POST",
      body: { alternativeSlug, note: text(form, "note") || null },
    });
  } catch (error) {
    return failure(error, "Your suggestion could not be sent.");
  }
  return { ok: "Thanks! Your suggestion was sent to the moderators." };
}

// ---------- Moderation ----------

export async function moderateSubmissionAction(_: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const decision = text(form, "decision");
  if (!["approve", "reject", "needs-changes"].includes(decision)) return { error: "Unknown decision." };
  try {
    await userApi(`/api/v1/admin/submissions/${id}/decision`, {
      method: "POST",
      body: { decision, note: text(form, "note") || null },
    });
  } catch (error) {
    return failure(error, "The decision could not be saved.");
  }
  revalidatePath("/admin");
  return { ok: decision === "approve" ? "Approved and published." : "Decision saved." };
}
