import { ArrowRight, BadgeCheck, Link2, Search, Sparkles, Trophy } from "lucide-react";
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
  const cta = (
    <Link href="/submit/new" className={buttonClass("primary", "lg")}>
      Submit your product <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <section className="border-b border-border bg-surface">
        <Container className="py-14 text-center sm:py-20">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="size-3.5" aria-hidden="true" /> Free during launch
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Get your product in front of people looking to switch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted sm:text-lg">
            {site.name} is where people compare software and find better alternatives. If you build something great, we
            want it here.
          </p>
          <div className="mt-8 flex justify-center">{cta}</div>
          <p className="mt-3 text-xs text-muted">Free for a limited time while we launch. A free account is required, and every listing is reviewed and approved by our team.</p>
        </Container>
      </section>

      <Container className="py-14">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-muted">Why list here</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-6">
              <Icon className="size-6 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-center text-xs font-semibold uppercase tracking-wider text-muted">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-border p-6">
              <span className="text-3xl font-bold text-accent/40">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 text-center text-xs font-semibold uppercase tracking-wider text-muted">FAQ</h2>
        <div className="mx-auto mt-6 max-w-3xl divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-accent px-6 py-10 text-center text-accent-foreground">
          <h2 className="text-2xl font-bold">Ready to get listed?</h2>
          <p className="mt-2 opacity-85">It takes about two minutes.</p>
          <Link href="/submit/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-accent hover:bg-white/90">
            Submit your product <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </>
  );
}
