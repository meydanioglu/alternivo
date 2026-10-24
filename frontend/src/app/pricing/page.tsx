import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/layout/page-parts";
import { buttonClass, cx } from "@/components/ui/styles";
import { site } from "@/config/site";
import { formatPrice, pricing } from "@/lib/auth/integrations";
import { faqJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing for makers",
  description: `List your software on ${site.name} for free. Optional one-time Fast Review and prepaid Featured or Growth promotion.`,
  alternates: { canonical: "/pricing" },
};

export const revalidate = 300;

const FAQ = [
  { question: "Is submitting a product free?", answer: "Yes. Submitting is free and always will be. Every product is reviewed against the same editorial guidelines." },
  { question: "How long does standard review take?", answer: "Up to 15 days from submission. Most submissions are reviewed sooner." },
  { question: "What do I get with Fast Review?", answer: "Your submission moves to the priority queue and is reviewed within 24 hours of a confirmed payment. It is a one-time fee per submission, not a subscription." },
  { question: "Does Fast Review guarantee approval?", answer: "No. Fast Review only changes how quickly we review. The same approval standards apply, and approval is never guaranteed. If we miss the 24-hour window you can ask for a full refund." },
  { question: "Can I upgrade an existing submission?", answer: "Yes. While a submission is waiting for review you can buy Fast Review for it from your Maker dashboard. The 24 hours start when the payment is confirmed." },
  { question: "Can I cancel Featured or Growth?", answer: "There is nothing to cancel: Featured and Growth are prepaid 30-day periods that never renew automatically. Buy another period to extend." },
  { question: "Are clicks or customers guaranteed?", answer: "No. We show your product to people browsing relevant pages and report impressions and clicks, but we cannot promise traffic, rankings, sign-ups or sales." },
  { question: "How are sponsored products displayed?", answer: "In separate, clearly labelled areas (“Sponsored”, “Featured”, “Spotlight”). Paid placements never change organic rankings, votes, ratings or reviews, and sponsored links use rel=\"sponsored\"." },
];

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    cta: { label: "Submit for Free", href: "/submit/new" },
    features: ["Submit any software or AI product", "Standard review queue (up to 15 days)", "Listed in relevant categories and alternatives pages once approved", "Basic product profile"],
  },
  {
    key: "fastReview",
    name: "Fast Review",
    period: "one-time, per submission",
    cta: { label: "Get Fast Review", href: "/submit/new" },
    note: "Add-on to a submission — not a subscription",
    features: ["Priority queue", "Reviewed within 24 hours of payment", "Same approval standards", "Upgrade an existing submission any time"],
  },
  {
    key: "featured",
    name: "Featured",
    period: "per 30 days",
    cta: { label: "Choose Featured", href: "/maker?tab=products" },
    features: ["Featured badge (labelled as sponsored)", "Rotation in sponsored spots on relevant category pages", "Featured strip on the homepage", "Impressions and outbound-click analytics", "Vendor dashboard"],
  },
  {
    key: "growth",
    name: "Growth",
    period: "per 30 days",
    highlight: true,
    cta: { label: "Choose Growth", href: "/maker?tab=products" },
    features: ["Everything in Featured", "Sponsored alternative on competitors’ alternatives pages in your category", "Daily performance analytics", "Run multiple campaigns", "Priority access to placements"],
  },
];

export default async function PricingPage() {
  const data = await pricing();
  const price = (key: string) => data.plans.find((p) => p.key === key);
  const placements = data.plans.filter((p) => p.inventoryLimit !== null);
  const foundingLeft = Math.max(0, data.foundingLimit - data.foundingTaken);

  return (
    <Container className="py-12">
      <JsonLd data={faqJsonLd(FAQ)} />
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Grow your software with {site.name}</h1>
        <p className="mt-3 text-lg text-muted">
          Get discovered by people actively searching for software alternatives. Start for free and promote your product when you’re ready.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => {
          const plan = price(t.key);
          return (
            <section
              key={t.key}
              className={cx("flex flex-col rounded-2xl border bg-surface p-6", t.highlight ? "border-accent ring-2 ring-accent/30" : "border-border")}
            >
              <h2 className="font-semibold">{t.name}</h2>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{t.price ?? (plan ? formatPrice(plan.priceCents, data.currency) : "—")}</span>
                <span className="text-sm text-muted">{t.period}</span>
              </p>
              {t.note && <p className="mt-1 text-xs font-medium text-accent">{t.note}</p>}
              <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={t.cta.href} className={buttonClass(t.highlight ? "primary" : "outline", "md", "mt-6 w-full")}>
                {t.cta.label}
              </Link>
            </section>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted">
        Fast Review is a one-time review fee. Featured and Growth are prepaid 30-day promotion periods that never renew automatically.
        {foundingLeft > 0 && (
          <>
            {" "}Founding vendors: the first {data.foundingLimit} paying Featured or Growth vendors keep today’s price for as long as their
            subscription stays active ({foundingLeft} places left).
          </>
        )}
      </p>

      {placements.length > 0 && (
        <section className="mx-auto mt-14 max-w-4xl">
          <h2 className="text-xl font-semibold">Self-serve sponsorships</h2>
          <p className="mt-1 text-sm text-muted">
            Book a fixed-length placement for one of your approved products. Inventory is limited, so each spot is shared by only a few
            sponsors. Every campaign is reviewed before it goes live and is clearly labelled.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Placement</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Spots at a time</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2">{formatPrice(p.priceCents, data.currency)}</td>
                    <td className="px-4 py-2">{p.durationDays} days</td>
                    <td className="px-4 py-2">{p.key === "homepageSpotlight" ? `${p.inventoryLimit} site-wide` : `${p.inventoryLimit} per page`}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-4 py-2 font-medium">Custom promotion</td>
                  <td className="px-4 py-2">Custom quote</td>
                  <td className="px-4 py-2" colSpan={2}>
                    Quoted manually — see the <Link href="/help" className="text-accent underline">Help center</Link> to get in touch.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Link href="/maker?tab=campaigns" className={buttonClass("outline", "sm", "mt-4")}>Create a campaign</Link>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="mb-4 text-xl font-semibold">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((f) => (
            <details key={f.question} className="rounded-lg border border-border bg-surface px-4 py-3">
              <summary className="cursor-pointer font-medium">{f.question}</summary>
              <p className="mt-2 text-sm text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">
          Card payments are processed securely by PayTR. See our{" "}
          <Link href="/terms#paid-services" className="underline">terms</Link>.
        </p>
      </section>
    </Container>
  );
}
