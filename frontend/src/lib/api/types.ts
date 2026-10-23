/**
 * Types mirroring the ASP.NET Core API DTOs (camelCase JSON).
 * Once the API is running, `npm run gen:api` generates `openapi.d.ts` from the live OpenAPI
 * document; these hand-written types should then be replaced by the generated ones.
 */

export type PricingName = "free" | "freemium" | "paid" | "free-trial" | "one-time-purchase" | "subscription";

export interface PlatformRef {
  slug: string;
  name: string;
  kind: "desktop" | "mobile" | "web" | "extension" | "server";
}

export interface CategoryRef {
  slug: string;
  name: string;
}

export interface NamedRef {
  slug: string;
  name: string;
}

export interface LicenseRef {
  slug: string;
  name: string;
  isOpenSource: boolean;
  family: string;
}

export interface ApplicationSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  logoUrl: string | null;
  pricing: PricingName[];
  license: LicenseRef | null;
  isOpenSource: boolean;
  isSelfHostable: boolean;
  isPrivacyFocused: boolean;
  hasOfflineSupport: boolean;
  platforms: PlatformRef[];
  primaryCategory: CategoryRef | null;
  likeCount: number;
  reviewCount: number;
  ratingAverage: number | null;
}

export interface Review {
  id: string;
  applicationId: string;
  application: NamedRef | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  pros: string | null;
  cons: string | null;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail {
  summary: ApplicationSummary;
  description: string | null;
  websiteUrl: string | null;
  developer: string | null;
  categories: CategoryRef[];
  features: NamedRef[];
  tags: NamedRef[];
  aliases: string[];
  screenshots: { url: string; caption: string | null; width: number; height: number }[];
  verification: "verified" | "unverified";
  lastVerifiedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  releasedOn: string | null;
  alternativesCount: number;
  alternativesIndexable: boolean;
  topAlternatives: ApplicationSummary[];
  alternativeTo: ApplicationSummary[];
  similar: ApplicationSummary[];
  recentReviews: Review[];
}

export interface RankingSignal {
  name: string;
  value: number;
  weight: number;
}

export interface AlternativeItem {
  relationshipId: string;
  application: ApplicationSummary;
  source: "editorial" | "community" | "import";
  voteCount: number;
  note: string | null;
  score: number;
  signals: RankingSignal[];
  reasons: string[];
  sharedFeatures: string[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AlternativesPage {
  source: ApplicationSummary;
  totalAlternatives: number;
  isIndexable: boolean;
  results: Paged<AlternativeItem>;
  facets: {
    platforms: FacetValue[];
    pricing: FacetValue[];
    licenses: FacetValue[];
    categories: FacetValue[];
    features: FacetValue[];
    attributes: FacetValue[];
  };
}

export interface Category {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  applicationCount: number;
  isFeatured: boolean;
  children: Category[];
}

export interface ComparisonRef {
  slug: string;
  applications: NamedRef[];
}

export interface CategoryDetail {
  slug: string;
  name: string;
  description: string | null;
  seoIntro: string | null;
  icon: string | null;
  applicationCount: number;
  parent: CategoryRef | null;
  children: Category[];
  featured: ApplicationSummary[];
  comparisons: ComparisonRef[];
  related: CategoryRef[];
}

export interface CompareApplication {
  summary: ApplicationSummary;
  websiteUrl: string | null;
  developer: string | null;
  releasedOn: string | null;
  categories: CategoryRef[];
  features: NamedRef[];
}

export interface Compare {
  canonicalSlug: string;
  applications: CompareApplication[];
  featureMatrix: { slug: string; name: string; presentIn: string[] }[];
  sharedFeatures: string[];
  isIndexable: boolean;
}

export interface Home {
  stats: { applications: number; categories: number; alternatives: number; reviews: number };
  popularSearches: { query: string; count: number }[];
  trending: ApplicationSummary[];
  recentlyAdded: ApplicationSummary[];
  newlyReleased: ApplicationSummary[];
  featuredCategories: Category[];
  openSource: ApplicationSummary[];
  free: ApplicationSummary[];
  aiTools: ApplicationSummary[];
  communityFavorites: ApplicationSummary[];
  comparisons: ComparisonRef[];
  recentReviews: Review[];
}

export interface Suggestion {
  type: "application" | "category";
  slug: string;
  name: string;
  subtitle: string | null;
  logoUrl: string | null;
}

export interface SearchResult {
  query: string;
  applications: Paged<ApplicationSummary>;
  categories: CategoryRef[];
}

export interface SitemapEntry {
  path: string;
  lastModified: string;
}

export interface Redirect {
  fromPath: string;
  toPath: string | null;
  statusCode: number;
}

export interface LaunchItem {
  rank: number;
  application: ApplicationSummary;
  votes: number;
  launchedAt: string;
}

export interface LaunchWeek {
  week: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
  previousWeek: string | null;
  nextWeek: string | null;
  items: LaunchItem[];
}

export interface LaunchArchiveWeek {
  week: string;
  startsAt: string;
  launchCount: number;
  winners: LaunchItem[];
}

export interface LeaderboardItem {
  rank: number;
  application: ApplicationSummary;
  votes: number;
}
