import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { SellerDetails } from "@/components/legal/legal-parts";
import { business } from "@/config/business";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${site.name} for support, payments and refunds, listing corrections and privacy requests.`,
  alternates: { canonical: "/contact" },
};

// Re-rendered at runtime so seller details from the server environment appear without a rebuild.
export const revalidate = 300;

export default function ContactPage() {
  return (
    <LegalPage title="Contact" intro={<p>We read every message. Please include your account e-mail and, for payments, the order number shown in your Maker dashboard.</p>}>
      <section>
        <h2>Support</h2>
        <ul>
          {business.email && <li>E-mail: <a href={`mailto:${business.email}`}>{business.email}</a></li>}
          {business.phone && <li>Phone: <a href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a></li>}
          <li>Answers to common questions: <Link href="/help">Help center</Link></li>
          <li>Purchases, orders and campaign status: your <Link href="/maker">Maker dashboard</Link></li>
        </ul>
        <p>We aim to answer within 2 business days.</p>
      </section>
      <section>
        <h2>What to contact us about</h2>
        <ul>
          <li><strong>Payments and refunds</strong> — see the <Link href="/refund-policy">refund policy</Link> for what is refundable and how to ask.</li>
          <li><strong>Listing corrections</strong> — wrong pricing, platforms or details on a product page.</li>
          <li><strong>Claiming a listing</strong> — if your product was added by someone else.</li>
          <li><strong>Privacy requests</strong> — access, correction or deletion of your data (see the <Link href="/privacy">privacy policy</Link>).</li>
        </ul>
      </section>
      <section>
        <h2>Seller details</h2>
        <SellerDetails />
      </section>
    </LegalPage>
  );
}
