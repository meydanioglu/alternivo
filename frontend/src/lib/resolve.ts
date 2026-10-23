import { notFound, permanentRedirect } from "next/navigation";
import { api, isNotFound } from "./api/client";

/**
 * Loads page data. On 404 it consults managed redirects (renamed slugs) and issues a
 * permanent redirect, otherwise renders the not-found page.
 */
export async function loadOrNotFound<T>(load: () => Promise<T>, path: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  const redirect = await api.redirect(path);
  if (redirect?.toPath && redirect.statusCode !== 410) {
    permanentRedirect(redirect.toPath);
  }
  notFound();
}
