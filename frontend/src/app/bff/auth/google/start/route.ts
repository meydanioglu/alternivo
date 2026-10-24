import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { site } from "@/config/site";
import { googleConfig } from "@/lib/auth/integrations";

const GOOGLE_STATE_COOKIE = "alt_gs";

/** Starts Google sign-in (OIDC authorization-code flow); the code is exchanged server-side by the API. */
export async function GET(request: Request) {
  const config = await googleConfig();
  if (!config.enabled || !config.clientId) return Response.redirect(`${site.url}/login?error=google`, 303);

  const rawNext = new URL(request.url).searchParams.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  const state = randomBytes(24).toString("base64url");
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/bff/auth/google",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${site.url}/bff/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 303);
}
