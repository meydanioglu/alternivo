import "server-only";
import { cookies, headers } from "next/headers";
import { apiBaseUrl } from "@/lib/api/client";

/**
 * Backend-for-frontend session. The API issues bearer tokens (ASP.NET Identity); the browser never sees them:
 * they live in httpOnly cookies and every authenticated call goes through Server Components or Server Actions.
 */
const ACCESS_COOKIE = "alt_at";
const REFRESH_COOKIE = "alt_rt";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  emailConfirmed: boolean;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  twitter: string | null;
  gitHub: string | null;
  linkedIn: string | null;
  isProfilePublic: boolean;
  showLikes: boolean;
  createdAt: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

const STAFF_ROLES = ["SuperAdmin", "Admin", "Editor", "Moderator"];
export const isStaff = (user: UserProfile | null) => !!user && user.roles.some((r) => STAFF_ROLES.includes(r));

async function forwardHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const result: Record<string, string> = { accept: "application/json" };
  if (forwarded) result["X-Forwarded-For"] = forwarded;
  return result;
}

async function isHttps() {
  return (await headers()).get("x-forwarded-proto") === "https";
}

async function readProblem(response: Response): Promise<AuthApiError> {
  let message = response.statusText || "Request failed";
  let errors: Record<string, string[]> = {};
  try {
    const problem = (await response.json()) as { detail?: string; title?: string; errors?: Record<string, string[]> };
    errors = problem.errors ?? {};
    const first = Object.values(errors).flat()[0];
    message = problem.detail ?? first ?? problem.title ?? message;
  } catch {
    // Empty or non-JSON body.
  }
  return new AuthApiError(response.status, message, errors);
}

/** Unauthenticated call to the auth endpoints (login, register, refresh). */
export async function authPost<T>(path: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/${path}`, {
    method: "POST",
    headers: { ...(await forwardHeaders()), "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw await readProblem(response);
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

/** Stores tokens. Only callable from Server Actions and Route Handlers. */
export async function storeTokens(tokens: TokenResponse) {
  const jar = await cookies();
  const secure = await isHttps();
  const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  jar.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: Math.max(60, tokens.expiresIn - 60) });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 14 });
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function login(email: string, password: string) {
  const tokens = await authPost<TokenResponse>("login", { email, password });
  if (tokens) await storeTokens(tokens);
}

/**
 * Returns a usable access token, refreshing it when it has expired. Server Components cannot write cookies,
 * so `persist` is false there: the refreshed token is used for this render and persisted on the next action.
 */
async function accessToken(persist: boolean): Promise<string | null> {
  const jar = await cookies();
  const current = jar.get(ACCESS_COOKIE)?.value;
  if (current) return current;
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    const tokens = await authPost<TokenResponse>("refresh", { refreshToken });
    if (!tokens) return null;
    if (persist) await storeTokens(tokens);
    return tokens.accessToken;
  } catch {
    if (persist) await clearTokens();
    return null;
  }
}

/** Authenticated API call. Throws AuthApiError (401 when signed out). */
export async function userApi<T>(
  path: string,
  init: { method?: string; body?: unknown; persist?: boolean } = {},
): Promise<T> {
  const token = await accessToken(init.persist ?? true);
  if (!token) throw new AuthApiError(401, "Please sign in to continue.");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(await forwardHeaders()),
      authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw await readProblem(response);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Authenticated multipart upload (e.g. avatar). Throws AuthApiError. */
export async function userUpload<T>(path: string, form: FormData): Promise<T> {
  const token = await accessToken(true);
  if (!token) throw new AuthApiError(401, "Please sign in to continue.");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { ...(await forwardHeaders()), authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) throw await readProblem(response);
  return (await response.json()) as T;
}

/** Current user for Server Components; null when signed out or the session is no longer valid. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    return await userApi<UserProfile>("/api/v1/users/me", { persist: false });
  } catch {
    return null;
  }
}
