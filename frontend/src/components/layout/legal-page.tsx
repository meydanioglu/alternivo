import type { ReactNode } from "react";
import { Container } from "./page-parts";

/** Shared layout for help and legal pages: a readable column with consistent heading and paragraph styles. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated?: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-10">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated && <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>}
        {intro && <div className="mt-4 text-foreground/80">{intro}</div>}
        <div className="mt-8 flex flex-col gap-8 text-[15px] leading-7 text-foreground/85 [&_a]:text-accent [&_a]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </article>
    </Container>
  );
}
