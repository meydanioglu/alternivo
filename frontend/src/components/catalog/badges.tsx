import { Lock, Monitor, Puzzle, Server, Smartphone, Globe, ShieldCheck, WifiOff, HardDrive } from "lucide-react";
import Link from "next/link";
import type { ApplicationSummary, CategoryRef, LicenseRef, PlatformRef, PricingName } from "@/lib/api/types";
import { pricingHeadline } from "@/lib/format";
import { chipClass } from "@/components/ui/styles";

const PLATFORM_ICON = { desktop: Monitor, mobile: Smartphone, web: Globe, extension: Puzzle, server: Server } as const;

export function PricingBadge({ pricing }: { pricing: PricingName[] }) {
  const headline = pricingHeadline(pricing);
  const color = headline === "Free" ? "success" : headline === "Free plan available" ? "accent" : "default";
  return <span className={chipClass(color)}>{headline}</span>;
}

export function LicenseBadge({ license }: { license: LicenseRef | null }) {
  if (!license) return null;
  return license.isOpenSource ? (
    <span className={chipClass("success", "soft")} title={license.name}>
      Open source
    </span>
  ) : (
    <span className={chipClass("default", "soft")} title={license.name}>
      <Lock className="size-3" aria-hidden="true" />
      {license.family === "proprietary" ? "Proprietary" : license.name}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: PlatformRef }) {
  const Icon = PLATFORM_ICON[platform.kind] ?? Monitor;
  return (
    <span className={chipClass("default", "tertiary")}>
      <Icon className="size-3" aria-hidden="true" />
      {platform.name}
    </span>
  );
}

/** Compact platform list: shows up to `max` names and a "+N" overflow count. */
export function PlatformList({ platforms, max = 4 }: { platforms: PlatformRef[]; max?: number }) {
  if (platforms.length === 0) return null;
  const shown = platforms.slice(0, max);
  const rest = platforms.length - shown.length;
  return (
    <p className="text-xs text-muted">
      <span className="sr-only">Platforms: </span>
      {shown.map((p) => p.name).join(" · ")}
      {rest > 0 && <span title={platforms.slice(max).map((p) => p.name).join(", ")}> · +{rest}</span>}
    </p>
  );
}

export function CategoryChip({ category }: { category: CategoryRef }) {
  return (
    <Link href={`/category/${category.slug}`} className={chipClass("default", "secondary", "sm", "hover:underline")}>
      {category.name}
    </Link>
  );
}

export function AttributeBadges({ app }: { app: Pick<ApplicationSummary, "isSelfHostable" | "isPrivacyFocused" | "hasOfflineSupport"> }) {
  return (
    <>
      {app.isSelfHostable && (
        <span className={chipClass("default", "tertiary")}>
          <HardDrive className="size-3" aria-hidden="true" /> Self-hostable
        </span>
      )}
      {app.isPrivacyFocused && (
        <span className={chipClass("default", "tertiary")}>
          <ShieldCheck className="size-3" aria-hidden="true" /> Privacy-focused
        </span>
      )}
      {app.hasOfflineSupport && (
        <span className={chipClass("default", "tertiary")}>
          <WifiOff className="size-3" aria-hidden="true" /> Offline
        </span>
      )}
    </>
  );
}

export function AlternativeRelationshipBadge({ source }: { source: "editorial" | "community" | "import" }) {
  return (
    <span className={chipClass(source === "community" ? "accent" : "default", "tertiary")}>
      {source === "community" ? "Community suggestion" : source === "editorial" ? "Editor curated" : "Same category"}
    </span>
  );
}
