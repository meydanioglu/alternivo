import { Heart, MessageSquare, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { Container } from "@/components/layout/page-parts";

const PERKS = [
  { icon: Heart, text: "Like and save the apps you love" },
  { icon: MessageSquare, text: "Write reviews and vote on alternatives" },
  { icon: Rocket, text: "Submit and launch your own product" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid-cols-2">
        <div className="hidden flex-col justify-between gap-8 bg-accent p-8 text-accent-foreground md:flex">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider opacity-80">{site.name}</p>
            <p className="mt-3 text-2xl font-bold leading-tight">Join the community choosing better software.</p>
          </div>
          <ul className="flex flex-col gap-3">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-full bg-white/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-xs opacity-75">Free forever. No spam.</p>
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </Container>
  );
}
