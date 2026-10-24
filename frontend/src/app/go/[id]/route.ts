import { headers } from "next/headers";
import { site } from "@/config/site";
import { apiBaseUrl } from "@/lib/api/client";

/** Sponsored outbound link: counts the click, then redirects to the product's website. Not indexable (robots + header). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const placement = new URL(request.url).searchParams.get("p") ?? "";
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  let target: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/sponsored/click`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(forwarded ? { "X-Forwarded-For": forwarded } : {}),
          "user-agent": h.get("user-agent") ?? "",
        },
        body: JSON.stringify({ applicationId: id, placement: placement.slice(0, 40) }),
        cache: "no-store",
      });
      if (response.ok) target = ((await response.json()) as { url: string }).url;
    } catch {
      target = null;
    }
  }

  const safe = target && /^https?:\/\//i.test(target) ? target : site.url;
  return new Response(null, { status: 302, headers: { location: safe, "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" } });
}
