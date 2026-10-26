import { ArrowRight, BadgeCheck, Link2, Search, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { Container } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Submit Your Software — Get Listed on ${site.name}`,
  description: `List your app, software or AI tool on ${site.name} for free and reach people looking for alternatives.`,
  path: "/submit",
});

const BENEFITS = [
  { icon: Search, title: "Reach the right people", text: "Listed by category, platform and pricing, so you show up for people searching for exactly what you build." },
  { icon: Link2, title: "Shown as an alternative", text: "Get linked as an alternative to the products people already know — the moment they are looking to switch." },
  { icon: Trophy, title: "Climb the rankings", text: "Community likes, reviews and votes move your product up in transparent alternative rankings." },
  { icon: BadgeCheck, title: "A permanent, citable page", text: "Your own page with description, platforms, pricing, license, reviews and a direct link to your website." },
];

const STEPS = [
  ["Create a free account", "Takes less than a minute — just an e-mail and a password."],
  ["Tell us about the product", "Name and website are enough; categories, pricing and alternatives help it rank."],
  ["We review it", "A person checks every submission, usually within a few days."],
  ["You're live", "Your product gets its own page and appears in alternatives and categories."],
];

const FAQ = [
  ["Is it free?", "Yes — submitting is free during our launch period. You only need a free account."],
  ["Will my product go live immediately?", "No. Every submission is reviewed and approved by our team first, usually within a few days. You can follow its status on your account page."],
  ["How long does review take?", "Usually a few days. You can follow the status on your account page."],
  ["What gets accepted?", "Real, working software with a public website. We do not list spam, clones or unfinished landing pages."],
  ["Can I suggest my product as an alternative to others?", "Yes — add them in the submission form, or use “Suggest an alternative” on any app page."],
];

export default function SubmitLandingPage() {
  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">For makers · Free during launch</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Get your product in front of people looking to switch
        </h1>
        <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted">
          {site.name} is where people compare software and find better alternatives. If you build something great, we want it
          here.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/submit/new" className={buttonClass("primary", "lg")}>
            Submit your product <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/pricing" className={buttonClass("ghost", "lg")}>
            Optional paid options
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">A free account is required, and every listing is reviewed and approved by our team.</p>
        <p className="mt-1 text-xs text-muted">
          Building an AI product? <Link href="/submit-ai-tool" className="text-accent underline">Submit your AI tool</Link>.
        </p>
      </header>

      <section className="mt-16" aria-labelledby="why">
        <h2 id="why" className="eyebrow mb-5">Why list here</h2>
        <div className="grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-surface p-6">
              <h3 className="flex items-center gap-2 font-medium">
                <Icon className="size-4 text-muted" aria-hidden="true" /> {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="how">
        <h2 id="how" className="eyebrow mb-5">How it works</h2>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="border-t border-border pt-4">
              <span className="text-sm tabular-nums text-muted">Step {i + 1}</span>
              <h3 className="mt-1 font-medium">{title}</h3>
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
          <h2 className="text-lg font-semibold tracking-tight">Ready to get listed?</h2>
          <p className="mt-1 text-sm text-muted">It takes about two minutes.</p>
        </div>
        <Link href="/submit/new" className={buttonClass("primary", "md")}>
          Submit your product <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </Container>
  );
}
