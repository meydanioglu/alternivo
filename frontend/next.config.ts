import { MERGED_BEST } from "./src/content/best-pages";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return Object.entries(MERGED_BEST).map(([from, to]) => ({ source: `/best/${from}`, destination: `/best/${to}`, permanent: true }));
  },
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  images: {
    // Application logos/screenshots are served from the configured media host only.
    remotePatterns: process.env.MEDIA_HOST
      ? [{ protocol: "https", hostname: process.env.MEDIA_HOST }]
      : [],
  },
  // In production Caddy serves /media from the API; in local development, proxy it to the live site.
  async rewrites() {
    return process.env.NODE_ENV === "development" && process.env.DEV_MEDIA_ORIGIN
      ? [{ source: "/media/:path*", destination: `${process.env.DEV_MEDIA_ORIGIN}/media/:path*` }]
      : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
