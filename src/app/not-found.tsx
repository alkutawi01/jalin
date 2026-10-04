import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";

export const metadata: Metadata = {
  title: "Halaman tidak ditemui",
  robots: { index: false, follow: true }
};

const WHERE: Array<{ label: string; href: string }> = [
  { label: "Cerpen", href: "/kategori/cerpen" },
  { label: "Novela", href: "/kategori/novela" },
  { label: "Bersiri", href: "/kategori/bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis" }
];

/** Shown for any address that does not exist (the server still answers 404). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <section className="site-shell not-found">
          <p className="story-kicker">404</p>
          <h1>Halaman ini tidak ditemui</h1>
          <p className="dek">Alamat itu mungkin sudah berubah atau karya itu belum diterbitkan. Mari kita cari semula jalan.</p>
          <p>
            <a className="hero-featured-cta" href="/">Kembali ke laman utama</a>
          </p>
          <nav className="not-found-links" aria-label="Terokai kategori">
            {WHERE.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
