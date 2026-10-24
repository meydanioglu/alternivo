import { cookies } from "next/headers";
import { site } from "@/config/site";
import { authPost, storeTokens } from "@/lib/auth/session";

const STATE_COOKIE = "alt_gs";

/** Google redirects here; we check the state, let the API exchange the code, and store our own session tokens. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/bff/auth/google" });

  let expected: { state: string; next: string } | null = null;
  try {
    expected = saved ? (JSON.parse(saved) as { state: string; next: string }) : null;
  } catch {
    expected = null;
  }
  const code = url.searchParams.get("code");
  if (!expected || !code || url.searchParams.get("state") !== expected.state) {
    return Response.redirect(`${site.url}/login?error=google_state`, 303);
  }

  try {
    const tokens = await authPost<{ accessToken: string; refreshToken: string; expiresIn: number }>("google", {
      code,
      redirectUri: `${site.url}/bff/auth/google/callback`,
    });
    if (!tokens) throw new Error("No tokens");
    await storeTokens(tokens);
  } catch {
    return Response.redirect(`${site.url}/login?error=google`, 303);
  }

  const next = expected.next.startsWith("/") && !expected.next.startsWith("//") ? expected.next : "/account";
  return Response.redirect(`${site.url}${next}`, 303);
}
