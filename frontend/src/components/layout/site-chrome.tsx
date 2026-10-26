import { Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/styles";
import { UserAvatar } from "@/components/account/user-avatar";
import { CategoriesMenu } from "@/components/catalog/category-directory";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { flattenCategories } from "@/lib/categories";
import { site } from "@/config/site";
import { SearchCommand } from "@/components/search/search-command";
import { Container } from "./page-parts";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";
import { ThemeSwitch } from "./theme-switch";

export function Logo() {
  // Full wordmark artwork, one version per theme (white lettering on dark, dark lettering on light).
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label={`${site.name} home`}>
      <Image src="/brand/logo-on-light.png" alt={site.name} width={753} height={175} priority className="h-7 w-auto dark:hidden" />
      <Image src="/brand/logo-on-dark.png" alt={site.name} width={699} height={163} priority className="hidden h-7 w-auto dark:block" />
    </Link>
  );
}

export async function MainHeader() {
  const [user, tree] = await Promise.all([getCurrentUser(), api.categories().catch(() => [])]);
  const categories = flattenCategories(tree);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-14 items-center gap-3">
        <MobileNav signedIn={!!user} />
        <Logo />
        <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) =>
            link.href === "/categories" ? (
              <CategoriesMenu key={link.href} categories={categories} />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Link href="/search" aria-label="Search" className="grid size-9 place-items-center rounded-md text-muted hover:text-foreground sm:hidden">
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <div className="hidden w-56 sm:block lg:w-52 xl:w-72">
            <SearchCommand shortcut placeholder="Search apps…" />
          </div>
          <Link href="/submit" className={buttonClass("outline", "sm", "hidden whitespace-nowrap md:inline-flex")}>
            <Plus className="size-4" aria-hidden="true" /> Submit
          </Link>
          {user && (
            <Link href="/maker" className={buttonClass("ghost", "sm", "hidden whitespace-nowrap md:inline-flex")}>
              Maker
            </Link>
          )}
          <ThemeSwitch />
          {user ? (
            <Link
              href="/account"
              aria-label={`Your account (${user.displayName})`}
              title={user.displayName}
              className="shrink-0 rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-accent"
            >
              <UserAvatar name={user.displayName} url={user.avatarUrl} size="sm" />
            </Link>
          ) : (
            <Link href="/login" className={buttonClass("primary", "sm", "whitespace-nowrap")}>
              Sign in
            </Link>
          )}
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
      { href: "/ais", label: "AI tools" },
      { href: "/new-apps", label: "Recently added" },
      { href: "/trending", label: "Most liked" },
      { href: "/launches", label: "Launches" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/categories", label: "All categories" },
      { href: "/category/note-taking", label: "Note taking" },
      { href: "/category/password-managers", label: "Password managers" },
      { href: "/category/photo-editing", label: "Photo editing" },
      { href: "/software?license=open-source", label: "Open-source software" },
      { href: "/software?pricing=free", label: "Free software" },
      { href: "/software?selfHosted=true", label: "Self-hosted software" },
    ],
  },
  {
    title: "For makers",
    links: [
      { href: "/submit", label: "Submit a product" },
      { href: "/submit-ai-tool", label: "Submit an AI tool" },
      { href: "/maker", label: "Maker dashboard" },
      { href: "/pricing", label: "Pricing" },
      { href: "/launches/archive", label: "Launch archive" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/compare", label: "Comparisons" },
      { href: "/best", label: "Best lists" },
      { href: "/guides", label: "Guides" },
      { href: "/help", label: "Help center" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <Container className="grid gap-8 py-12 sm:grid-cols-3 lg:grid-cols-6">
        <div className="flex flex-col gap-3 sm:col-span-3 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{col.title}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-foreground/75 hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-1 border-t border-border py-5 text-xs text-muted sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Product names and trademarks belong to their respective owners. Sponsored placements are always labelled.</span>
      </Container>
    </footer>
  );
}
