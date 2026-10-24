import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What personal data ${site.name} collects, why, and the choices you have.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 24, 2026" intro={<p>We collect as little personal data as we need to run {site.name}. This page explains what we collect and why.</p>}>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> e-mail, display name, password hash, and the optional profile fields you fill in (username, bio, avatar, links).</li>
          <li><strong>Google sign-in:</strong> if you use it, we receive your Google account ID, e-mail, name and whether the e-mail is verified. We never see your Google password.</li>
          <li><strong>Your activity:</strong> likes, votes, bookmarks, reviews and product submissions.</li>
          <li><strong>Purchases:</strong> for paid maker services we store the order, amount and payment result reported by PayTR. Card details are entered on PayTR&apos;s secure page and never reach us.</li>
          <li><strong>Technical data:</strong> IP address and user agent in server logs, kept for security and abuse prevention.</li>
        </ul>
      </section>
      <section>
        <h2>Cookies and analytics</h2>
        <p>
          We use strictly necessary cookies to keep you signed in (httpOnly session cookies) and to remember your theme. We measure page
          views with our own anonymous, cookie-free counter and with Tiny Analytics, a privacy-friendly analytics service, which also
          collects performance and error data. We do not use advertising cookies or sell personal data.
        </p>
      </section>
      <section>
        <h2>Service providers</h2>
        <ul>
          <li><strong>PayTR</strong> — card payment processing (we share your e-mail, name, IP address and the order amount).</li>
          <li><strong>Google</strong> — optional sign-in.</li>
          <li><strong>Tiny Analytics</strong> — website analytics.</li>
          <li><strong>OpenAI</strong> — helps draft product descriptions from vendors&apos; public websites. No member data is sent.</li>
          <li><strong>Our hosting provider</strong> — stores the site and its database.</li>
        </ul>
      </section>
      <section>
        <h2>Why we use your data</h2>
        <p>
          To provide your account and the features you use (contract), to keep the site secure and fight spam (legitimate interest), to
          process purchases (contract and legal obligations), and to improve the site using aggregated statistics (legitimate interest).
        </p>
      </section>
      <section>
        <h2>Retention</h2>
        <p>
          Account data is kept while your account exists. Deleting your account removes your profile; public reviews may be anonymised
          instead of deleted. Purchase records are kept as long as tax law requires.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          You can view and edit your data in <Link href="/settings">Settings</Link>, ask us to delete your account, and ask us for a copy of your data,
          for correction, restriction or erasure, or object to processing. You may also complain to your data protection authority
          (in Türkiye, KVKK).
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions see the <Link href="/help">Help center</Link>. We may update this policy and will show the date of the last
          change at the top.
        </p>
      </section>
    </LegalPage>
  );
}
