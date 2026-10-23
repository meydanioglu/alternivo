import { apiBaseUrl } from "@/lib/api/client";

/** Username availability check for the settings form. */
export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get("u") ?? "";
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/users/username-available?u=${encodeURIComponent(u.slice(0, 40))}`, {
      cache: "no-store",
    });
    return Response.json(await response.json());
  } catch {
    return Response.json({ available: false, reason: "error" }, { status: 502 });
  }
}
