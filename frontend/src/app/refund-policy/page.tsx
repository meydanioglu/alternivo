import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { SupportContact } from "@/components/legal/legal-parts";
import { AGREEMENT_UPDATED } from "@/config/business";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Refund and cancellation policy",
  description: `When ${site.name}'s paid maker services can be cancelled or refunded, and how refunds are paid back.`,
  alternates: { canonical: "/refund-policy" },
};

// Re-rendered at runtime so seller details from the server environment appear without a rebuild.
export const revalidate = 300;

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund and cancellation policy"
      updated={AGREEMENT_UPDATED}
      intro={<p>This policy covers {site.name}&apos;s own paid services for makers. Listing a product is free. We do not sell third-party software, so refunds for products you buy from a vendor are handled by that vendor.</p>}
    >
      <section>
        <h2>1. Right of withdrawal (consumers)</h2>
        <p>
          If you buy as a consumer, you may withdraw from the contract within 14 days of the purchase without giving a reason, and you receive a
          full refund, provided the service has not yet started.
        </p>
        <p>
          Our services are performed electronically and start as soon as the payment is confirmed (a 30-day period starts running, or a
          submission enters the priority queue). At checkout you are asked to expressly request that performance starts immediately and to
          acknowledge that, under the applicable distance contracts rules, the right of withdrawal does not apply to services whose
          performance has begun with your approval before the withdrawal period ends. If you do not want this, do not complete the payment.
        </p>
        <p>
          The statutory exception never limits the refunds below, which we grant regardless of the withdrawal right.
        </p>
      </section>
      <section>
        <h2>2. When you get a refund</h2>
        <ul>
          <li><strong>Fast Review not delivered on time:</strong> if your submission is not reviewed within 24 hours of payment confirmation, you get a full refund on request. A rejection is a completed review and is not by itself a reason for a refund.</li>
          <li><strong>Sponsored campaign rejected:</strong> if we do not approve a campaign you paid for, it is refunded in full automatically.</li>
          <li><strong>Service not started:</strong> a Featured or Growth period queued to start after your current period, or a campaign that has not started, can be cancelled for a full refund.</li>
          <li><strong>We end a placement:</strong> if we end a paid placement early for any reason other than a breach of our <Link href="/terms">terms</Link> by you, the unused days are refunded pro rata.</li>
          <li><strong>Our error:</strong> duplicate charges, a charge for a service that could not be delivered, or a technical fault on our side are refunded in full.</li>
          <li><strong>Anything else:</strong> statutory rights you have as a consumer always apply in addition to this policy.</li>
        </ul>
      </section>
      <section>
        <h2>3. What is not refundable</h2>
        <ul>
          <li>Days of a Featured, Growth or campaign period that have already run, except in the cases above.</li>
          <li>Results we never promise: approval of a submission, rankings, traffic, clicks, sign-ups or sales.</li>
          <li>A placement we end because you broke our <Link href="/terms">terms</Link> (for example misleading content); in that case unused days are still refunded unless the law allows otherwise.</li>
        </ul>
      </section>
      <section>
        <h2>4. Cancellation</h2>
        <p>
          Featured and Growth are prepaid 30-day periods and never renew automatically, so there is no subscription to cancel. A sponsorship
          reservation that has not been paid yet can be cancelled from your Maker dashboard at no cost; the hold simply lapses after 30 minutes.
        </p>
      </section>
      <section>
        <h2>5. How to ask for a refund</h2>
        <p>
          Contact <SupportContact /> with your account e-mail and order number (shown in your Maker dashboard). We reply to refund requests
          within 3 business days. Approved refunds are made to the card used for payment through our payment provider, within 14 days
          of approval; when the money appears on your statement depends on your bank.
        </p>
      </section>
    </LegalPage>
  );
}
