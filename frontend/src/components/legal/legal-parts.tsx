import Link from "next/link";
import { business, businessRows } from "@/config/business";
import { site } from "@/config/site";
import { formatPrice, pricing, type PlanInfo } from "@/lib/auth/integrations";

/** What each paid service is and when it counts as delivered; shared by pricing-related legal pages and checkout. */
export const SERVICE_TERMS: Record<string, { what: string; delivery: string }> = {
  fastReview: {
    what: "One-time priority review of one product submission. Approval is never guaranteed.",
    delivery: "Starts when PayTR confirms the payment; the submission is reviewed (approved, rejected or returned for changes) within 24 hours.",
  },
  featured: {
    what: "“Featured” badge and rotation in labelled sponsored spots for one of your listed products.",
    delivery: "Active for 30 days from payment confirmation, or from the end of a current period of the same plan. Does not renew automatically.",
  },
  growth: {
    what: "Everything in Featured plus sponsored placement on competitors’ alternatives pages in your category.",
    delivery: "Active for 30 days from payment confirmation, or from the end of a current period of the same plan. Does not renew automatically.",
  },
  homepageSpotlight: {
    what: "Labelled spotlight placement on the homepage for a fixed period, subject to limited inventory.",
    delivery: "Runs for the booked period after editorial approval of the campaign. Rejected campaigns are refunded in full.",
  },
  categorySponsorship: {
    what: "Labelled sponsored placement on one category page for a fixed period.",
    delivery: "Runs for the booked period after editorial approval of the campaign. Rejected campaigns are refunded in full.",
  },
  competitorSponsorship: {
    what: "Labelled sponsored placement on one competitor’s alternatives page for a fixed period.",
    delivery: "Runs for the booked period after editorial approval of the campaign. Rejected campaigns are refunded in full.",
  },
  alternativeCard: {
    what: "Labelled sponsored alternative card on one alternatives page for a fixed period.",
    delivery: "Runs for the booked period after editorial approval of the campaign. Rejected campaigns are refunded in full.",
  },
};

const period = (p: PlanInfo) => (p.durationDays ? `${p.durationDays} days` : "one-time");

/** Paid services with their current prices, straight from the server-side price list. */
export async function ServicesTable() {
  const { plans, currency } = await pricing();
  if (plans.length === 0) return <p>The current list of paid services and prices is on the <Link href="/pricing">pricing page</Link>.</p>;
  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="bg-surface-secondary text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Service</th>
            <th scope="col" className="px-3 py-2 font-medium">Price</th>
            <th scope="col" className="px-3 py-2 font-medium">Duration</th>
            <th scope="col" className="px-3 py-2 font-medium">What you get</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {plans.map((p) => (
            <tr key={p.key} className="align-top">
              <th scope="row" className="px-3 py-2 font-medium text-foreground">{p.name}</th>
              <td className="px-3 py-2 tabular-nums">{formatPrice(p.priceCents, currency)}</td>
              <td className="px-3 py-2">{period(p)}</td>
              <td className="px-3 py-2">{SERVICE_TERMS[p.key]?.what ?? "See the pricing page."}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        Prices in {currency}. {business.taxNote ?? "The amount shown at checkout is the total amount charged."} The amount charged is always shown before payment.
      </p>
    </div>
  );
}

/** Seller identification. Only configured fields are shown; nothing is filled in by default. */
export function SellerDetails() {
  const rows = businessRows();
  if (rows.length === 0) {
    return <p>The seller&apos;s registered business details will be published here before paid services are offered. Until then, contact us through the <Link href="/help">Help center</Link>.</p>;
  }
  return (
    <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[12rem_1fr]">
      <dt className="text-muted">Website</dt>
      <dd>{site.url}</dd>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Support contact line: the configured e-mail, otherwise the Help center. */
export function SupportContact() {
  return business.email ? (
    <a href={`mailto:${business.email}`}>{business.email}</a>
  ) : (
    <Link href="/contact">our contact page</Link>
  );
}
