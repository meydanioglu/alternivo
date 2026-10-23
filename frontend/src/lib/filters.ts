import { z } from "zod";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const list = (schema: z.ZodType<string>, max: number) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
    .transform((values) => values.filter((x) => schema.safeParse(x).success).slice(0, max));

export const PRICING_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Paid" },
  { value: "free-trial", label: "Free trial" },
  { value: "one-time-purchase", label: "One-time purchase" },
  { value: "subscription", label: "Subscription" },
] as const;

export const LICENSE_OPTIONS = [
  { value: "open-source", label: "Open source" },
  { value: "proprietary", label: "Proprietary" },
  { value: "gpl", label: "GPL" },
  { value: "mit", label: "MIT" },
  { value: "apache", label: "Apache" },
  { value: "other", label: "Other" },
] as const;

export const ATTRIBUTE_OPTIONS = [
  { value: "self-hosted", param: "selfHosted", label: "Self-hostable" },
  { value: "privacy-focused", param: "privacyFocused", label: "Privacy-focused" },
  { value: "offline", param: "offline", label: "Works offline" },
] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "likes", label: "Most liked" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
] as const;

const pricingValues = PRICING_OPTIONS.map((o) => o.value) as [string, ...string[]];
const licenseValues = LICENSE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const sortValues = SORT_OPTIONS.map((o) => o.value) as [string, ...string[]];
const flag = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const schema = z.object({
  platform: list(slug, 20),
  pricing: list(z.enum(pricingValues), 6),
  license: list(z.enum(licenseValues), 6),
  feature: list(slug, 10),
  category: slug.optional().catch(undefined),
  selfHosted: flag,
  privacyFocused: flag,
  offline: flag,
  sort: z.enum(sortValues).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export type CatalogFilters = z.output<typeof schema>;

/** Validates untrusted query-string input. Unknown or malformed values are dropped, never forwarded. */
export function parseFilters(params: RawSearchParams): CatalogFilters {
  return schema.parse({
    platform: params.platform,
    pricing: params.pricing,
    license: params.license,
    feature: params.feature,
    category: first(params.category),
    selfHosted: first(params.selfHosted),
    privacyFocused: first(params.privacyFocused),
    offline: first(params.offline),
    sort: first(params.sort),
    page: first(params.page),
  });
}

/** True when any filter or non-default sort is applied — such URLs are noindex and canonicalise to the base page. */
export function hasActiveFilters(f: CatalogFilters): boolean {
  return (
    f.platform.length > 0 ||
    f.pricing.length > 0 ||
    f.license.length > 0 ||
    f.feature.length > 0 ||
    !!f.category ||
    f.selfHosted ||
    f.privacyFocused ||
    f.offline ||
    (!!f.sort && f.sort !== "relevance")
  );
}

export function filtersToQuery(f: CatalogFilters, pageSize = 20) {
  return {
    platform: f.platform,
    pricing: f.pricing,
    license: f.license,
    feature: f.feature,
    category: f.category,
    selfHosted: f.selfHosted,
    privacyFocused: f.privacyFocused,
    offline: f.offline,
    sort: f.sort,
    page: f.page,
    pageSize,
  };
}
