/** Primary navigation: the few places people go to discover and decide. Everything else lives in the footer. */
export const NAV_LINKS = [
  { href: "/software", label: "Software" },
  { href: "/ais", label: "AI tools" },
  { href: "/categories", label: "Categories" },
  { href: "/compare", label: "Compare" },
  { href: "/best", label: "Best lists" },
] as const;

/** Secondary destinations shown in the mobile menu under "More". */
export const MORE_LINKS = [
  { href: "/launches", label: "Launches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing for makers" },
] as const;
