import { SOLUTION_PAGES, publishedSolutions } from "@/content/solutions/pages";
import { solutionProduct } from "@/content/solutions/products";
import topicsFile from "@/content/solutions/topics.json";
import type { FactValue, Requirement, SolutionPage, SolutionProduct, SolutionTopic } from "@/content/solutions/types";

export const SOLUTION_TOPICS = topicsFile.topics as SolutionTopic[];

export type CheckResult = "met" | "not-met" | "unverified";
export type Verdict = "recommended" | "needs-verification" | "excluded";

export interface Evaluation {
  product: SolutionProduct;
  checks: { requirement: Requirement; result: CheckResult; detail?: string }[];
  verdict: Verdict;
  /** Soft requirements met, used to order products with the same verdict. */
  score: number;
}

const resultOf = (value: FactValue | undefined): CheckResult => (value === true ? "met" : value === false ? "not-met" : "unverified");

/**
 * Matches products against the reader's requirements using sourced facts only. A false hard requirement
 * excludes a product; an unknown one means it cannot be recommended until verified. Sponsorship plays no part.
 */
export function evaluate(product: SolutionProduct, requirements: Requirement[]): Evaluation {
  const checks = requirements.map((requirement) => {
    const fact = product.facts[requirement.fact];
    return { requirement, result: resultOf(fact?.value), detail: fact?.detail };
  });
  const hard = checks.filter((c) => c.requirement.hard);
  const verdict: Verdict = hard.some((c) => c.result === "not-met")
    ? "excluded"
    : hard.every((c) => c.result === "met")
      ? "recommended"
      : "needs-verification";
  const score = checks.filter((c) => !c.requirement.hard && c.result === "met").length;
  return { product, checks, verdict, score };
}

const ORDER: Record<Verdict, number> = { recommended: 0, "needs-verification": 1, excluded: 2 };

/** All products a page evaluates, grouped by verdict; the page's own product order breaks ties. */
export function evaluatePage(page: SolutionPage): Evaluation[] {
  return page.products
    .map((id, index) => ({ e: solutionProduct(id), index }))
    .filter((x): x is { e: SolutionProduct; index: number } => x.e !== undefined)
    .map(({ e, index }) => ({ ev: evaluate(e, page.requirements), index }))
    .sort((a, b) => ORDER[a.ev.verdict] - ORDER[b.ev.verdict] || b.ev.score - a.ev.score || a.index - b.index)
    .map((x) => x.ev);
}

/**
 * A published page is indexable when it recommends at least two products and every product it recommends has
 * a source for each requirement and a sourced price; anything thinner stays noindex.
 */
export function solutionIndexable(page: SolutionPage, evaluations = evaluatePage(page)) {
  const recommended = evaluations.filter((e) => e.verdict === "recommended");
  return (
    recommended.length >= 2 &&
    recommended.every((e) => e.product.pricing && page.requirements.every((r) => e.product.facts[r.fact]?.source))
  );
}

export const topicOf = (page: SolutionPage) => SOLUTION_TOPICS.find((t) => t.id === page.topicId);

/** Published solution pages that evaluate a catalog product, for links back from its software profile. */
export function solutionsForCatalogSlug(slug: string) {
  return publishedSolutions().filter((p) => p.products.some((id) => solutionProduct(id)?.catalogSlug === slug));
}

/** Editorial status of every topic: its page's status when one exists, otherwise the topic's own. */
export function topicPipeline() {
  const pages = new Map(SOLUTION_PAGES.map((p) => [p.topicId, p]));
  return SOLUTION_TOPICS.map((t) => ({ topic: t, page: pages.get(t.id) ?? null, status: pages.get(t.id)?.status ?? t.status }));
}
