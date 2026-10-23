import Link from "next/link";
import { site } from "@/config/site";
import { SearchCommand } from "@/components/search/search-command";
import { Container } from "./page-parts";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";
import { ThemeSwitch } from "./theme-switch";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight" aria-label={`${site.name} home`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path d="M9 11.5h9.5a3.5 3.5 0 0 1 0 7H13.5a3.5 3.5 0 0 0 0 7H23" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="23" cy="11.5" r="2.2" className="fill-teal-300" />
      </svg>
      <span className="text-lg">{site.name}</span>
    </Link>
  );
}

export function MainHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-16 items-center gap-3">
        <MobileNav />
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex w-full max-w-xs items-center gap-2 lg:max-w-sm">
          <SearchCommand shortcut placeholder="Search apps…" />
          <ThemeSwitch />
        </div>
      </Container>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/software", label: "All software" },
      { href: "/new-apps", label: "New apps" },
      { href: "/trending", label: "Most liked" },
      { href: "/compare", label: "Comparisons" },
    ],
  },
  {
    title: "Popular categories",
    links: [
      { href: "/category/note-taking", label: "Note taking" },
      { href: "/category/password-managers", label: "Password managers" },
      { href: "/category/photo-editing", label: "Photo editing" },
      { href: "/category/ai-assistants", label: "AI assistants" },
    ],
  },
  {
    title: "Browse",
    links: [
      { href: "/categories", label: "All categories" },
      { href: "/software?license=open-source", label: "Open-source software" },
      { href: "/software?pricing=free", label: "Free software" },
      { href: "/software?selfHosted=true", label: "Self-hosted software" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-2 text-sm font-semibold">{col.title}</h2>
            <ul className="flex flex-col gap-1.5 text-sm text-muted">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="border-t border-border py-4 text-xs text-muted">
        © {new Date().getFullYear()} {site.name}. Product names and trademarks belong to their respective owners. Listings
        marked “not yet verified” have not been checked by an editor.
      </Container>
    </footer>
  );
}
