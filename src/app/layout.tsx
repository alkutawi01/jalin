import type { Metadata } from "next";
import { Inter, Figtree } from "next/font/google";
import "./globals.css";
import { SITE_URL, DEFAULT_SHARE_IMAGE } from "../lib/seo";
import BootScreen from "../components/reader/BootScreen";

/**
 * The sans-serif the stylesheet has always named (Inter) is now actually loaded, self-hosted by Next at build time, with a
 * size-adjusted fallback so the page does not jump when it arrives. The stylesheet reads it through --font-inter.
 */
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });
/** The typeface of the main menu (Izzat chose Figtree, 5 Oct 2026). Only the menu uses it; labels and buttons stay Inter. */
const figtree = Figtree({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jalin: Cerpen, novela dan cerita bersiri berilustrasi",
    template: "%s · Jalin"
  },
  description: "Selami dunia melalui cerita di Jalin, platform cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Terbitan Adjung Press.",
  icons: {
    icon: "/brand/jalin-favicon.svg",
    shortcut: "/brand/jalin-favicon.svg"
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
    <html lang="ms" className={`${inter.variable} ${figtree.variable}`}>
      <body>
        <BootScreen />
        {children}
      </body>
    </html>
  );
}
