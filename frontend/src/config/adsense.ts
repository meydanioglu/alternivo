/**
 * Google AdSense publisher ID ("pub-" plus 16 digits), read from the server environment. Nothing ad-related is
 * served until a real ID is set: no ads.txt, no AdSense script and no advertising section in the privacy policy.
 */
const raw = process.env.ADSENSE_PUBLISHER_ID?.trim().replace(/^ca-/, "") ?? "";

export const adsensePublisherId = /^pub-\d{16}$/.test(raw) ? raw : null;
