import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { site } from "@/config/site";
import { paymentProvider } from "@/config/business";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply when you use ${site.name}, submit products or buy paid placements.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 26, 2026" intro={<p>These terms apply to your use of {site.name} ({site.url}). By using the site or creating an account you agree to them.</p>}>
      <section>
        <h2>1. The service</h2>
        <p>
          {site.name} is a directory where people discover, compare and discuss software and AI tools. Listings, rankings and editorial
          content are provided for information only. Product names and logos belong to their owners.
        </p>
      </section>
      <section>
        <h2>2. Accounts</h2>
        <ul>
          <li>You must be at least 16 years old and give accurate information.</li>
          <li>You are responsible for your account; keep your password safe. You may sign in with e-mail and password or with Google.</li>
          <li>You can ask us to delete your account at any time.</li>
        </ul>
      </section>
      <section>
        <h2>3. Your content</h2>
        <p>
          You keep ownership of reviews, comments and submissions you post. You give us a worldwide, non-exclusive, royalty-free licence
          to host, display and adapt them on the site. Do not post anything unlawful, misleading, infringing, or reviews of your own
          product or a competitor&apos;s. We may moderate, edit for formatting or remove content that breaks these rules.
        </p>
      </section>
      <section>
        <h2>4. Product submissions</h2>
        <p>
          Submitting a product requires an account and is free during our launch period. Every submission is reviewed; we decide at our
          discretion whether and how a product is listed, and we may update listing content for accuracy.
        </p>
      </section>
      <section id="paid-services">
        <h2>5. Paid services for makers</h2>
        <ul>
          <li>Submitting a product is free. Optional paid services are listed on our <Link href="/pricing">pricing page</Link>. They are digital promotional services provided by {site.name} itself; we do not sell or license third-party software.</li>
          <li>
            Each purchase is governed by the <Link href="/distance-sales-agreement">pre-contract information and distance sales agreement</Link>,
            which you confirm at checkout, together with our <Link href="/delivery-policy">delivery policy</Link> and{" "}
            <Link href="/refund-policy">refund policy</Link>.
          </li>
          <li>
            Card payments are processed by {paymentProvider}. Prices are shown before payment, in the currency
            charged.
          </li>
          <li>
            <strong>Fast Review</strong> (one-time, per submission) means your submission is reviewed within 24 hours after the payment is
            confirmed. It does not guarantee approval, publication, ranking or traffic. If we do not review it within 24 hours, you can ask for a
            full refund.
          </li>
          <li>
            <strong>Featured</strong> and <strong>Growth</strong> are prepaid 30-day periods. They do not renew automatically; buying another
            period extends the current one. Founding-vendor prices stay the same while periods are renewed without interruption.
          </li>
          <li>
            <strong>Sponsorship campaigns</strong> run for a fixed period, are reviewed before they go live and are subject to limited inventory.
            If we reject a campaign you get a full refund.
          </li>
          <li>All paid placements are labelled (“Featured”, “Sponsored”, “Spotlight”, “Fast Review”) and never change organic rankings, votes, ratings or reviews.</li>
          <li>We do not promise any number of visitors, clicks, sign-ups or sales.</li>
          <li>We may refuse or end a placement that breaks these terms; in that case unused prepaid time is refunded.</li>
          <li>If you buy as a consumer, you also have the statutory rights described in the distance sales agreement, including the right of withdrawal where it applies.</li>
        </ul>
      </section>
      <section>
        <h2>6. Acceptable use</h2>
        <p>
          Do not scrape the site in bulk, manipulate votes or reviews, use automated accounts, interfere with security, or use the site for
          anything unlawful. We may suspend accounts that do.
        </p>
      </section>
      <section>
        <h2>7. Disclaimers and liability</h2>
        <p>
          The site is provided “as is”. We do our best to keep information accurate but do not guarantee it; check details with the
          vendor before you buy. To the extent the law allows, our liability is limited to the amount you paid us in the 12 months before
          the claim.
        </p>
      </section>
      <section>
        <h2>8. Changes</h2>
        <p>We may update these terms. Significant changes will be announced on the site; continued use means you accept them.</p>
      </section>
      <section>
        <h2>9. Contact</h2>
        <p>
          Questions? See <Link href="/contact">Contact</Link> or the <Link href="/help">Help center</Link>. Our <Link href="/privacy">Privacy policy</Link> explains how we handle
          personal data.
        </p>
      </section>
    </LegalPage>
  );
}
