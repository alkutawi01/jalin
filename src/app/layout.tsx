import type { Metadata, Viewport } from "next";
import { Inter, Figtree } from "next/font/google";
import "./globals.css";
import "./themes.css";
import { SITE_URL, DEFAULT_SHARE_IMAGE } from "../lib/seo";
import BootScreen from "../components/reader/BootScreen";
import ThemeSync from "../components/reader/ThemeSync";
import { readerAccountsEnabled } from "../lib/reader-auth/enabled";
import { THEME_INIT_SCRIPT } from "../lib/site-theme-mode";

/**
 * The sans-serif the stylesheet has always named (Inter) is now actually loaded, self-hosted by Next at build time, with a
 * size-adjusted fallback so the page does not jump when it arrives. The stylesheet reads it through --font-inter.
 */
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });
/** The typeface of the main menu (Izzat chose Figtree, 5 Oct 2026). Only the menu uses it; labels and buttons stay Inter. */
const figtree = Figtree({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-figtree" });

/** The browser's own bar (address bar on a phone, status bar on iOS) takes the page's paper colour instead of white. */
export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  colorScheme: "light dark"
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jalin: Cerpen, novela dan cerita bersiri berilustrasi",
    template: "%s · Jalin"
  },
  description: "Selami dunia melalui cerita di Jalin, platform cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Terbitan Adjung Press.",
  icons: {
    icon: "/brand/jalin-favicon.svg",
    shortcut: "/brand/jalin-favicon.svg",
    apple: "/brand/apple-touch-icon.png"
  },
  openGraph: {
    type: "website",
    siteName: "Jalin — oleh Adjung",
    title: "Jalin: Cerpen, novela dan cerita bersiri berilustrasi",
    description: "Selami dunia melalui cerita berilustrasi dalam Bahasa Melayu.",
    url: "/",
    locale: "ms_MY",
    images: [DEFAULT_SHARE_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: "Jalin: Cerpen, novela dan cerita bersiri berilustrasi",
    description: "Selami dunia melalui cerita berilustrasi dalam Bahasa Melayu.",
    images: [DEFAULT_SHARE_IMAGE.url]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" className={`${inter.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme before the first paint so a dark device never sees a flash of the light page. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Feed readers and browsers find the feed of the newest works from any page. A page's own metadata alternates (its canonical)
            replaces the layout's, so this is a plain link rather than metadata. */}
        <link rel="alternate" type="application/rss+xml" title="Jalin: karya terbaharu" href="/feed.xml" />
      </head>
      <body>
        <ThemeSync accounts={readerAccountsEnabled()} />
        <BootScreen />
        {children}
      </body>
    </html>
  );
}
