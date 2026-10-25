import { site } from "@/config/site";
import { resolveSlug } from "@/content/keyword-targets";

/** /alternatives/{x} (keyword-plan URL) → the canonical /software/{slug}/alternatives page. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clean = slug.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) return new Response("Not found", { status: 404 });
  return Response.redirect(`${site.url}/software/${resolveSlug(clean)}/alternatives`, 308);
}
