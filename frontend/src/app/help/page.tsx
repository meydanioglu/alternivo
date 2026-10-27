import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { site } from "@/config/site";
import { faqJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Help center",
  description: `Answers about accounts, submitting products, launches, reviews and paid placements on ${site.name}.`,
  alternates: { canonical: "/help" },
};

const TOPICS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Account",
    items: [
      { q: "How do I create an account?", a: "Use “Sign in” in the header. You can register with e-mail and password, or continue with Google when it is available." },
      { q: "How do I change my profile or password?", a: "Open Settings. You can edit your profile, public links, privacy options and password there." },
      { q: "Can I delete my account?", a: "Yes. Contact us through the e-mail address on your account and we will delete it; public reviews may be anonymised." },
    ],
  },
  {
    title: "Submitting a product",
    items: [
      { q: "How do I submit my product?", a: "Sign in and use “Submit”. Submissions are free during our launch period and reviewed by our team, usually within a few days." },
      { q: "Where can I follow my submission?", a: "The Maker dashboard lists every submission with its status and any note from the moderators." },
      { q: "Why was my submission rejected?", a: "Common reasons are duplicates, unreachable websites or products that are not software. The moderator note explains what to change." },
    ],
  },
  {
    title: "Launches and votes",
    items: [
      { q: "What is the Buildboard?", a: "Approved submissions launch in the week they go live. Members vote, and the weekly ranking only counts votes cast during that week." },
      { q: "Can I vote for my own product?", a: "Yes, once, like any member. Fake accounts and vote trading lead to removal." },
    ],
  },
  {
    title: "Paid placements",
    items: [
      { q: "What can I buy?", a: "Fast Review (one-time), Featured and Growth (prepaid 30-day periods) and fixed-length sponsorship campaigns. Current prices are on the pricing page. All are optional." },
      { q: "Are paid placements labelled?", a: "Always. They show “Fast Review”, “Featured”, “Spotlight” or “Sponsored”, and never affect votes, ratings or reviews." },
      { q: "How is a purchase linked to my product?", a: "Start every purchase from your Maker dashboard (or the submit form) while signed in. Each payment is created for one specific submission, product or campaign and is applied automatically once the payment is confirmed." },
      { q: "Invoices, cancellation and refunds?", a: "Card payments are processed securely by our licensed payment provider. Featured and Growth are prepaid 30-day periods that do not renew automatically, so there is nothing to cancel. For refunds or invoices, contact us through the Help center." },
      { q: "I want to claim a listing someone else added.", a: "Claiming is not self-serve yet. Report the listing from its page and mention that you are the owner; we will verify and transfer it." },
    ],
  },
  {
    title: "Listings and reviews",
    items: [
      { q: "A listing has wrong information.", a: "Use the report option on the product page. Owners can submit corrections the same way." },
      { q: "How are rankings decided?", a: "Lists use community likes, ratings and editorial scores. Paid placements are shown separately and labelled." },
    ],
  },
];

export default function HelpPage() {
  const all = TOPICS.flatMap((t) => t.items);
  return (
    <LegalPage title="Help center" intro={<p>Quick answers about using {site.name}. Can&apos;t find what you need? Check the <Link href="/terms" className="text-accent underline">terms</Link> and <Link href="/privacy" className="text-accent underline">privacy policy</Link>.</p>}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(all.map((i) => ({ question: i.q, answer: i.a })))) }} />
      {TOPICS.map((topic) => (
        <section key={topic.title}>
          <h2>{topic.title}</h2>
          <div className="flex flex-col gap-2">
            {topic.items.map((item) => (
              <details key={item.q} className="rounded-lg border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer font-medium text-foreground">{item.q}</summary>
                <p className="mt-2 text-sm text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </LegalPage>
  );
}
