import { adsensePublisherId } from "@/config/adsense";

// Read at request time so the publisher ID can be set in the server's .env without a rebuild.
export const dynamic = "force-dynamic";

export function GET() {
  if (!adsensePublisherId) return new Response("Not found", { status: 404 });
  return new Response(`google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
