import type { ApplicationDetail } from "@/lib/api/types";
import { pricingLabel } from "@/lib/format";

const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/**
 * Questions people search for, answered only from facts we hold for this product
 * (pricing, platforms, license, developer, categories, ranked alternatives). Nothing is invented:
 * a question is skipped when we lack the data to answer it.
 */
export function buildAppFaq(app: ApplicationDetail): { question: string; answer: string }[] {
  const s = app.summary;
  const faq: { question: string; answer: string }[] = [];

  if (s.pricing.length > 0) {
    const free = s.pricing.includes("free");
    const freemium = s.pricing.includes("freemium");
    const trial = s.pricing.includes("free-trial");
    const labels = s.pricing.map(pricingLabel).join(", ");
    const answer = free
      ? `Yes. ${s.name} can be used for free (pricing: ${labels}).`
      : freemium
        ? `${s.name} has a free plan with paid upgrades (pricing: ${labels}).`
        : trial
          ? `${s.name} is a paid product with a free trial (pricing: ${labels}).`
          : `No, ${s.name} is a paid product (pricing: ${labels}).`;
    faq.push({ question: `Is ${s.name} free?`, answer });
  }

  if (s.platforms.length > 0) {
    faq.push({
      question: `What platforms does ${s.name} support?`,
      answer: `${s.name} is available on ${list(s.platforms.map((p) => p.name))}.`,
    });
  }

  if (s.license) {
    faq.push({
      question: `Is ${s.name} open source?`,
      answer: s.license.isOpenSource
        ? `Yes. ${s.name} is open source under the ${s.license.name} license.`
        : `No. ${s.name} is distributed under a ${s.license.name} license.`,
    });
  }

  if (app.developer) {
    faq.push({ question: `Who makes ${s.name}?`, answer: `${s.name} is developed by ${app.developer}.` });
  }

  if (app.topAlternatives.length > 0) {
    const names = app.topAlternatives.slice(0, 3).map((a) => a.name);
    faq.push({
      question: `What are the best alternatives to ${s.name}?`,
      answer: `The top-ranked alternatives to ${s.name} are ${list(names)}. ${
        app.alternativesCount > names.length ? `There are ${app.alternativesCount} alternatives in total, ranked by community votes, shared features and platform fit.` : ""
      }`.trim(),
    });
  }

  if (app.categories.length > 0) {
    faq.push({
      question: `What kind of software is ${s.name}?`,
      answer: `${s.name} is listed under ${list(app.categories.map((c) => c.name))}. ${s.shortDescription}`,
    });
  }

  return faq;
}

export function AppFaq({ name, items }: { name: string; items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section id="faq" className="anchor-section">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">Frequently asked questions about {name}</h2>
      <div className="divide-y divide-border border-y border-border">
        {items.map((q) => (
          <div key={q.question} className="py-4">
            <h3 className="font-medium">{q.question}</h3>
            <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-foreground/80">{q.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
