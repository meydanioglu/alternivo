import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { SERVICE_TERMS, ServicesTable, SupportContact } from "@/components/legal/legal-parts";
import { AGREEMENT_UPDATED } from "@/config/business";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Delivery and service activation policy",
  description: `How and when ${site.name}'s digital promotional services for makers are activated and delivered.`,
  alternates: { canonical: "/delivery-policy" },
};

export const revalidate = 300;

const ORDER = ["fastReview", "featured", "growth", "homepageSpotlight", "categorySponsorship", "competitorSponsorship", "alternativeCard"];
const NAMES: Record<string, string> = {
  fastReview: "Fast Review", featured: "Featured", growth: "Growth", homepageSpotlight: "Homepage Spotlight",
  categorySponsorship: "Category Sponsorship", competitorSponsorship: "Competitor Page Sponsorship", alternativeCard: "Sponsored Alternative Card",
};

export default function DeliveryPolicyPage() {
  return (
    <LegalPage
      title="Delivery and service activation"
      updated={AGREEMENT_UPDATED}
      intro={<p>All {site.name} paid services are digital services performed on {site.url}. Nothing is shipped and no physical delivery address is needed.</p>}
    >
      <section>
        <h2>1. Services and prices</h2>
        <ServicesTable />
      </section>
      <section>
        <h2>2. When a service starts</h2>
        <p>
          A service is activated automatically once our payment provider confirms the payment to us. You can see the status of every
          purchase in your <Link href="/maker">Maker dashboard</Link>, and we send no separate goods or licence keys.
        </p>
        <ul>
          {ORDER.map((k) => (
            <li key={k}><strong>{NAMES[k]}:</strong> {SERVICE_TERMS[k]?.delivery}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>3. If something goes wrong</h2>
        <ul>
          <li>If the payment is confirmed but the service does not appear as active in your dashboard within 1 hour, contact <SupportContact />.</li>
          <li>If we cannot deliver a service, you get a refund as described in the <Link href="/refund-policy">refund policy</Link>.</li>
          <li>Paid services never guarantee approval, rankings, traffic or sales.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
