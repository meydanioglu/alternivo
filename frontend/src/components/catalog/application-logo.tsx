import { cx } from "@/components/ui/styles";

const SIZES = { sm: "size-8 text-sm", md: "size-11 text-base", lg: "size-16 text-2xl" } as const;

/**
 * Product logo. Until a logo has been uploaded by an editor we render a deterministic
 * monogram instead of hot-linking third-party assets.
 */
export function ApplicationLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const box = cx("shrink-0 rounded-lg border border-border", SIZES[size]);
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- logo host is configurable; dimensions fixed to prevent CLS
    return <img src={logoUrl} alt="" className={cx(box, "bg-surface object-contain p-1")} loading="lazy" decoding="async" />;
  }

  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      aria-hidden="true"
      className={cx(box, "grid place-items-center font-semibold text-white")}
      style={{ backgroundColor: `oklch(0.52 0.13 ${hue})` }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
