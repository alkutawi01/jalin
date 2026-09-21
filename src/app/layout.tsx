import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jalin — oleh Adjung",
  description: "Fiksyen berilustrasi untuk jiwa muda."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
