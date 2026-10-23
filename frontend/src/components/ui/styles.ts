/**
 * HeroUI v3 BEM class helpers for Server Components. HeroUI's React components are client
 * components (and compound parts cannot be dotted into from the server), so server-rendered
 * links and badges reuse the same design-system classes without shipping extra JavaScript.
 */
type ButtonVariant = "primary" | "secondary" | "tertiary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export const buttonClass = (variant: ButtonVariant = "primary", size: Size = "md", extra = "") =>
  `button button--${variant} button--${size} ${extra}`.trim();

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";
type ChipVariant = "primary" | "secondary" | "tertiary" | "soft";

export const chipClass = (color: ChipColor = "default", variant: ChipVariant = "soft", size: Size = "sm", extra = "") =>
  `chip chip--${color} chip--${variant} chip--${size} ${extra}`.trim();

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
