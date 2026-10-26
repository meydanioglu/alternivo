import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { SellerDetails } from "@/components/legal/legal-parts";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `About ${site.name}`,
  description: `${site.name} is a software discovery and comparison platform. Learn how we rank alternatives, how we make money and who runs the site.`,
  alternates: { canonical: "/about" },
};

// Re-rendered at runtime so seller details from the server environment appear without a rebuild.
export const revalidate = 300;

export default function AboutPage() {
  return (
    <LegalPage title={`About ${site.name}`} intro={<p>{site.name} helps people find software and AI tools that fit them better — and compare them honestly before they switch.</p>}>
      <section>
        <h2>What we do</h2>
        <p>
          {site.name} is a software discovery and comparison platform. We list software products and AI tools with their pricing,
          platforms and licences, rank alternatives to well-known products and publish side-by-side comparisons, category pages and
          editorial best-of lists.
        </p>
        <p>
          We do not sell, resell or license third-party software. When you choose a product, you buy it (or sign up) directly with its
          vendor on the vendor&apos;s own website.
        </p>
      </section>
      <section>
        <h2>How rankings work</h2>
        <p>
          Alternatives are ranked by shared features, platform fit, community likes and votes and editor scores. Paid placements never change
          organic rankings, votes, ratings or reviews, and are always labelled (“Sponsored”, “Featured”, “Spotlight”).
        </p>
      </section>
      <section>
        <h2>How we make money</h2>
        <p>
          Listing a product is free. We sell our own digital promotional services to software makers — Fast Review, Featured and Growth
          promotion and fixed-duration sponsored placements. They are described on the <Link href="/pricing">pricing page</Link>, in the{" "}
          <Link href="/distance-sales-agreement">distance sales agreement</Link> and in our <Link href="/refund-policy">refund policy</Link>.
        </p>
      </section>
      <section>
        <h2>Who runs {site.name}</h2>
        <SellerDetails />
        <p>Questions, corrections or partnership requests: see <Link href="/contact">Contact</Link>.</p>
      </section>
    </LegalPage>
  );
}
