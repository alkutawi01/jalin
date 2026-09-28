import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jalin — oleh Adjung",
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
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
