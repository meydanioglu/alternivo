import { absoluteUrl, site } from "@/config/site";
import { BEST_PAGES, GROUP_LABELS } from "@/content/best-pages";
import { GUIDES } from "@/content/guides";
import { api } from "@/lib/api/client";

// Rendered per request (the API is not reachable at build time); API responses themselves are cached.
export const dynamic = "force-dynamic";

/** llms.txt: a plain-text map of the site for AI assistants and answer engines (https://llmstxt.org). */
export async function GET() {
  const [tree, home] = await Promise.all([api.categories().catch(() => []), api.home().catch(() => null)]);
  const top = tree.filter((c) => c.applicationCount > 0).sort((a, b) => b.applicationCount - a.applicationCount);

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${site.name} lists ${home?.stats.applications ?? "hundreds of"} software products and AI tools with pricing, platforms, licenses and ranked alternatives. Rankings are transparent: community likes and votes, shared features, platform fit and editor scores.`,
    "",
    "## Main pages",
    `- [All software](${absoluteUrl("/software")}): filterable catalogue by platform, pricing and license`,
    `- [AI tools](${absoluteUrl("/ais")}): AI assistants, agents, models and creative tools`,
    `- [Categories](${absoluteUrl("/categories")}): every category, including niche AI categories`,
    `- [Comparisons](${absoluteUrl("/compare")}): side-by-side product comparisons`,
    `- [Launches](${absoluteUrl("/launches")}): new products of the week, ranked by upvotes`,
    `- [Leaderboard](${absoluteUrl("/leaderboard")}): the most upvoted software`,
    `- [Best lists](${absoluteUrl("/best")}): editorial "best tools for X" lists with selection criteria`,
    `- [Guides](${absoluteUrl("/guides")}): how-to guides for building apps and games with AI`,
    "",
    "## Best lists",
    ...(Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]).flatMap((g) => [
      `### ${GROUP_LABELS[g]}`,
      ...BEST_PAGES.filter((b) => b.group === g).map((b) => `- [${b.title}](${absoluteUrl(`/best/${b.slug}`)}): ${b.criteria}`),
    ]),
    "",
    "## Guides",
    ...GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)}): ${g.description}`),
    "",
    "## Categories",
    ...top.flatMap((c) => [
      `- [${c.name}](${absoluteUrl(`/category/${c.slug}`)}): ${c.applicationCount} products`,
      ...c.children.filter((x) => x.applicationCount > 0).map((x) => `  - [${x.name}](${absoluteUrl(`/category/${x.slug}`)})`),
    ]),
    "",
    "## Page patterns",
    `- Product: ${absoluteUrl("/software/{slug}")}`,
    `- Alternatives to a product: ${absoluteUrl("/software/{slug}/alternatives")}`,
    `- Comparison: ${absoluteUrl("/compare/{a}-vs-{b}")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
