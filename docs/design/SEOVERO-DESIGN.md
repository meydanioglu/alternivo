# Alternivo design system

Generated with **UI/UX Pro Max v2.15.0** (`search.py --design-system`, dials: variance 3, motion 2, density 8)
and persisted in `design-system/alternivo/MASTER.md`. The brief's brand direction takes precedence where they differ.

## Decisions

| Token | UI/UX Pro Max output | Applied | Why |
|---|---|---|---|
| Style | Minimalism & Swiss | Same | Dense, scannable software database |
| Primary | `#2563EB` blue | Deep indigo `oklch(0.457 0.215 277)` (≈ indigo-700) | Brief asks for deep indigo |
| CTA accent | `#EA580C` orange | Teal used sparingly (logo mark, success states) | Brief asks for emerald/teal; avoids competing CTAs |
| Background | `#F8FAFC` | `oklch(0.985 0.003 265)` soft neutral | Same intent |
| Typography | Plus Jakarta Sans | Same, via `next/font` (self-hosted, `display: swap`) | No layout shift, no third-party font requests at runtime |
| Radius | — | `0.375rem` | Brief: avoid overly rounded cards |
| Motion | Subtle scroll reveal | None beyond hover/focus transitions | Brief: no unnecessary animation; respects `prefers-reduced-motion` |
| Dark mode | "Supported, avoid as default" | Supported; follows system preference, user toggle persisted | Brief requires both modes |

## Components

HeroUI v3 (3.2.x) is the component library. Interactive parts use HeroUI React components
(Button, Drawer, CheckboxGroup, Checkbox, Label). Server-rendered links and badges use HeroUI's own BEM classes
(`button button--primary`, `chip chip--soft`) so they match the design system without shipping client JavaScript —
HeroUI compound components cannot be used directly from React Server Components.

## Checklist (from the skill's pre-delivery list)

- [x] No emoji icons — Lucide SVG icons only
- [x] Visible focus states (`:focus-visible` outline using the accent)
- [x] `prefers-reduced-motion` respected
- [x] Icon-only buttons have `aria-label`
- [x] Combobox search with `aria-activedescendant`, listbox roles, keyboard support
- [ ] Contrast audit with real tooling — to do in phase 7 (Playwright + axe)
- [ ] Responsive verification at 375 / 768 / 1024 / 1440 px — to do once the app runs
