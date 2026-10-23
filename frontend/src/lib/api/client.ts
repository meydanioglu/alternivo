import type {
  AlternativesPage,
  ApplicationDetail,
  ApplicationSummary,
  Category,
  CategoryDetail,
  Compare,
  ComparisonRef,
  Home,
  Paged,
  PlatformRef,
  Redirect,
  SearchResult,
  SitemapEntry,
} from "./types";

/**
 * Server-side client for the ASP.NET Core API. Only import from Server Components,
 * route handlers or server actions: it reads the internal URL and shared key from the server env.
 */
const API_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:8080").replace(/\/$/, "");
const INTERNAL_KEY = process.env.API_INTERNAL_KEY ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

type Query = Record<string, string | number | boolean | readonly string[] | null | undefined>;

export function toSearchParams(query: Query): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

async function get<T>(path: string, options: { revalidate?: number; tags?: string[] } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (INTERNAL_KEY) headers["X-Internal-Key"] = INTERNAL_KEY;

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    next: { revalidate: options.revalidate ?? 60, tags: options.tags },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(response.status, `API ${path} failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as T;
}

const enc = encodeURIComponent;

export const api = {
  home: () => get<Home>("/api/v1/home", { revalidate: 120, tags: ["home"] }),

  applications: (query: Query) =>
    get<Paged<ApplicationSummary>>(`/api/v1/applications?${toSearchParams(query)}`, { tags: ["applications"] }),

  application: (slug: string) =>
    get<ApplicationDetail>(`/api/v1/applications/${enc(slug)}`, { tags: [`app:${slug}`] }),

  alternatives: (slug: string, query: Query) =>
    get<AlternativesPage>(`/api/v1/applications/${enc(slug)}/alternatives?${toSearchParams(query)}`, {
      tags: [`app:${slug}`],
    }),

  categories: () => get<Category[]>("/api/v1/categories", { revalidate: 600, tags: ["categories"] }),

  category: (slug: string) => get<CategoryDetail>(`/api/v1/categories/${enc(slug)}`, { tags: ["categories"] }),

  platforms: () => get<PlatformRef[]>("/api/v1/platforms", { revalidate: 3600 }),

  compare: (pair: string) => get<Compare>(`/api/v1/compare/${enc(pair)}`),

  popularComparisons: () => get<ComparisonRef[]>("/api/v1/compare/popular", { revalidate: 600 }),

  search: (q: string, page: number) =>
    get<SearchResult>(`/api/v1/search?${toSearchParams({ q, page })}`, { revalidate: 0 }),

  sitemap: (type: string) => get<SitemapEntry[]>(`/api/v1/seo/sitemaps/${enc(type)}`, { revalidate: 3600 }),

  redirect: async (path: string): Promise<Redirect | null> => {
    try {
      return await get<Redirect>(`/api/v1/seo/redirect?${toSearchParams({ path })}`, { revalidate: 300 });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  },
};

export const apiBaseUrl = API_URL;
export const apiInternalKey = INTERNAL_KEY;
