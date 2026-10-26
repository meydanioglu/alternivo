import { Container } from "./page-parts";

/**
 * Compact in-page navigation that sticks under the site header. Plain anchor links (no client JS); only sections that
 * actually render are passed in. Scrolls horizontally on small screens instead of wrapping.
 */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  if (sections.length < 3) return null;
  return (
    <nav aria-label="On this page" className="sticky top-14 z-30 border-y border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container>
        <ul className="-mx-2 flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="block rounded-md px-2 py-2.5 text-muted hover:text-foreground">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
