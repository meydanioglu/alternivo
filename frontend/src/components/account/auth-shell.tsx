import type { ReactNode } from "react";
import { Container } from "@/components/layout/page-parts";

const PERKS = ["Save and like the apps you use", "Review products and vote on alternatives", "Submit and launch your own product"];

/** Sign-in / sign-up frame: one calm, centred form with a short note on what an account is for. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Container className="py-12 sm:py-20">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-8 mt-1.5 text-sm text-muted">{subtitle}</p>
        {children}
        <ul className="mt-10 flex flex-col gap-1.5 border-t border-border pt-6 text-xs text-muted">
          {PERKS.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
              {p}
            </li>
          ))}
          <li className="mt-1">Free, and we never send spam.</li>
        </ul>
      </div>
    </Container>
  );
}
