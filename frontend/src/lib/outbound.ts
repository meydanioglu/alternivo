/**
 * Tags a link to a product's website so the vendor sees Alternivo as the referrer in their analytics
 * (utm_source=alternivo.com). Existing UTM parameters on the URL are kept; invalid URLs are returned unchanged.
 */
export function outboundUrl(url: string, medium = "referral"): string {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "alternivo.com");
    u.searchParams.set("utm_medium", medium);
    return u.toString();
  } catch {
    return url;
  }
}
