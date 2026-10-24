import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { Footer, MainHeader } from "@/components/layout/site-chrome";
import { themeInitScript } from "@/components/layout/theme-switch";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Discover better software alternatives`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  icons: {
    // Browser tab icon follows the OS/browser theme; favicon.ico is the fallback.
    icon: [
      // Search engines read the first icon without a media query: a solid square (Google shows it in a circle,
      // where a transparent mark disappears). Size is a multiple of 48px as Google requires.
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/favicon-on-light.png", type: "image/png", sizes: "192x192", media: "(prefers-color-scheme: light)" },
      { url: "/brand/favicon-on-dark.png", type: "image/png", sizes: "192x192", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <MainHeader />
        <main id="main">{children}</main>
        <Footer />
        <PageViewTracker />
        <Script
          src="https://dash.tinyanalytics.io/script.js?siteId=289"
          data-web-vitals="true"
          data-track-errors="true"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
