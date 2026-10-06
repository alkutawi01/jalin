import type { Metadata } from "next";
import { Inter, Figtree } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "../lib/seo";
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
    default: "Jalin",
    template: "%s · Jalin"
  },
  description: "Fiksyen berilustrasi untuk jiwa muda.",
  icons: {
    icon: "/brand/jalin-favicon.svg",
    shortcut: "/brand/jalin-favicon.svg"
  },
  openGraph: {
    type: "website",
    siteName: "Jalin — oleh Adjung",
    title: "Jalin — oleh Adjung",
    description: "Fiksyen berilustrasi untuk jiwa muda.",
    url: "/",
    locale: "ms_MY"
  },
  twitter: {
    card: "summary_large_image",
    title: "Jalin — oleh Adjung",
    description: "Fiksyen berilustrasi untuk jiwa muda."
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
