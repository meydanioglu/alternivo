import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { SellerDetails, ServicesTable, SupportContact } from "@/components/legal/legal-parts";
import { AGREEMENT_UPDATED, AGREEMENT_VERSION , paymentProvider } from "@/config/business";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Pre-contract information and distance sales agreement",
  description: `The pre-contract information and distance sales agreement that apply when you buy ${site.name}'s digital services for makers.`,
  alternates: { canonical: "/distance-sales-agreement" },
};

export const revalidate = 300;

export default function DistanceSalesAgreementPage() {
  return (
    <LegalPage
      title="Pre-contract information and distance sales agreement"
      updated={`${AGREEMENT_UPDATED} (version ${AGREEMENT_VERSION})`}
      intro={
        <p>
          This text applies to every purchase of a paid service on {site.url}. Before you pay, the checkout shows the service, the total amount
          and currency, and asks you to confirm that you have read this text. The version you accept is stored with your order.
        </p>
      }
    >
      <section id="pre-contract">
        <h2>Part A — Pre-contract information</h2>
        <h3 className="mt-3 font-semibold text-foreground">A1. Seller</h3>
        <SellerDetails />
        <h3 className="mt-5 font-semibold text-foreground">A2. Buyer</h3>
        <p>The holder of the {site.name} account that places the order, with the name and e-mail address of that account.</p>
        <h3 className="mt-5 font-semibold text-foreground">A3. Subject and main features</h3>
        <p>
          The subject of the contract is one digital promotional service provided by the Seller on {site.url}. The Seller does not sell or
          license third-party software. The services, prices and durations are:
        </p>
        <ServicesTable />
        <h3 className="mt-5 font-semibold text-foreground">A4. Price and payment</h3>
        <p>
          The total price, including any taxes, and the currency are shown on the checkout page before payment and are the amounts charged.
          Payment is a one-time card payment processed by {paymentProvider}; card details are entered on the payment provider&apos;s
          page and are not seen or stored by the Seller. No instalments and no automatic renewals are offered. There are no delivery costs.
        </p>
        <h3 className="mt-5 font-semibold text-foreground">A5. Performance (delivery)</h3>
        <p>
          The service is performed electronically and starts when the payment provider confirms the payment, as described in the{" "}
          <Link href="/delivery-policy">delivery policy</Link>. Fast Review is completed within 24 hours of payment confirmation; Featured and
          Growth run for 30 days; sponsored placements run for the booked period after editorial approval.
        </p>
        <h3 className="mt-5 font-semibold text-foreground">A6. Right of withdrawal</h3>
        <p>
          A Buyer who is a consumer may withdraw within 14 days of the contract without giving a reason, by notifying the Seller at{" "}
          <SupportContact />. The amount paid is refunded within 14 days of the notice, by the same payment method, at no cost to the Buyer.
        </p>
        <p>
          Under the applicable distance contracts rules, the right of withdrawal does not apply to services that are performed instantly in
          electronic form, or to services whose performance has started, with the consumer&apos;s approval, before the withdrawal period
          ends. At checkout the Buyer is asked to expressly request immediate performance and to confirm awareness of this. Refunds the Seller
          grants under its <Link href="/refund-policy">refund policy</Link> apply in addition and are not limited by this exception.
        </p>
        <h3 className="mt-5 font-semibold text-foreground">A7. Complaints and disputes</h3>
        <p>
          Complaints can be sent to <SupportContact />. A consumer may also apply to the Consumer Arbitration Committee or the Consumer Court
          at the consumer&apos;s or the Seller&apos;s place of residence, within the monetary limits set each year by the Ministry of Trade.
        </p>
      </section>

      <section id="agreement">
        <h2>Part B — Distance sales agreement</h2>
        <div className="flex flex-col gap-3">
          <p><strong>B1. Parties.</strong> This agreement is made between the Seller (Part A1) and the Buyer (Part A2) electronically when the Buyer confirms it at checkout and completes the payment.</p>
          <p><strong>B2. Subject.</strong> The provision of the service selected at checkout, with the features, price and duration shown there and in Part A3.</p>
          <p><strong>B3. Formation.</strong> The contract is formed when the payment provider confirms the payment. If the payment fails, no contract is formed and nothing is charged.</p>
          <p><strong>B4. Seller&apos;s obligations.</strong> To perform the service as described, to label all paid placements as such, to keep organic rankings, votes and reviews independent of payments, and to refund the Buyer in the cases listed in the <Link href="/refund-policy">refund policy</Link>.</p>
          <p><strong>B5. Buyer&apos;s obligations.</strong> To give accurate information, to promote only products the Buyer is entitled to promote and to follow the <Link href="/terms">terms of service</Link>. Content that is unlawful or misleading may be refused or removed.</p>
          <p><strong>B6. No guaranteed results.</strong> Paid services do not guarantee approval, rankings, traffic, clicks, sign-ups or sales.</p>
          <p><strong>B7. Withdrawal and refunds.</strong> As set out in Part A6 and the <Link href="/refund-policy">refund policy</Link>.</p>
          <p><strong>B8. Records.</strong> The Seller keeps the order, the accepted version of this agreement and the time of acceptance. The Buyer can see the order in the Maker dashboard and may ask for a copy of this agreement at any time.</p>
          <p><strong>B9. Business buyers.</strong> If the Buyer acts for a business and not as a consumer, the consumer-specific provisions (withdrawal right, consumer dispute bodies) do not apply; the refund policy still does.</p>
          <p><strong>B10. Governing law.</strong> The laws of the Republic of Türkiye apply. Mandatory consumer protection rules of the Buyer&apos;s country of residence are not affected.</p>
        </div>
      </section>
    </LegalPage>
  );
}
