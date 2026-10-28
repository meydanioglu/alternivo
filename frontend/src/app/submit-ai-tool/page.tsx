import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { Container } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Submit Your AI Tool for Free — AI Directory Listing on ${site.name}`,
  description: `Submit your AI tool or SaaS to ${site.name} for free. Get a reviewed listing with a followed link to your website, and appear in alternatives pages, comparisons and categories.`,
  path: "/submit-ai-tool",
});

const PLACES = [
  ["Your product page", "Description, features, pricing, platforms, license, FAQ and a followed link to your website."],
  ["Alternatives pages", "Listed as an alternative to the tools people already use — the moment they are looking to switch."],
  ["Comparisons", "Side-by-side comparison pages with related products when there is a real overlap."],
  ["Categories and best lists", "Shown in the categories that fit, from AI writing to AI game makers and app builders."],
];

const FAQ = [
  ["Is it free to submit an AI tool?", `Yes. Submitting an AI tool or SaaS product to ${site.name} is free. You only need a free account.`],
  ["How long does review take?", "Free listings need the Alternivo badge on your homepage and are reviewed within 15 days (7 once the badge is verified). Optional Fast Review gets your submission reviewed within 24 hours of payment — it does not guarantee approval."],
  ["Is the link to my website dofollow?", "Yes. The website link on an approved product page is a normal, followed link."],
  ["What gets accepted?", "Real, working AI tools and software with a public website. We do not list spam, clones or unfinished landing pages."],
  ["Where will my tool appear?", "On its own product page, in relevant categories, on alternatives pages of related tools and in comparisons where there is a real overlap."],
  ["Can I show a badge on my site?", "Yes. After approval, your Maker dashboard gives you a “Featured on Alternivo” badge with embed code that links to your listing."],
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export default function SubmitAiToolPage() {
  return (
    <Container className="py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className="max-w-2xl">
        <p className="eyebrow">AI directory submission</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Submit your AI tool to {site.name} — free</h1>
        <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted">
          List your AI tool or SaaS where people compare software and look for alternatives. Every listing is reviewed by a person, gets a
          followed link to your website and shows up next to the tools your users already know.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/submit/new" className={buttonClass("primary", "lg")}>
            Submit your AI tool <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/pricing" className={buttonClass("ghost", "lg")}>
            Fast Review and promotion
          </Link>
        </div>
      </header>

      <dl className="mt-12 grid max-w-3xl gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">
        {[
          ["Price", "Free"],
          ["Review", "Up to 15 days · 24h with Fast Review"],
          ["Website link", "Followed (dofollow)"],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface p-5">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1 font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-16" aria-labelledby="where">
        <h2 id="where" className="eyebrow mb-5">Where your tool appears</h2>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PLACES.map(([title, text]) => (
            <li key={title} className="border-t border-border pt-4">
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="eyebrow mb-2">Questions</h2>
        <div className="divide-y divide-border border-y border-border">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-4">
              <h3 className="font-medium">{q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-col gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">List your AI tool today</h2>
          <p className="mt-1 text-sm text-muted">It takes about two minutes. Name and website are enough to start.</p>
        </div>
        <Link href="/submit/new" className={buttonClass("primary", "md")}>
          Submit your AI tool <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </Container>
  );
}
