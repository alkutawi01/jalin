/** The five kinds of content; the footer's "Terokai" column lists these. */
export const CONTENT_LINKS: { label: string; href: string; match?: string }[] = [
  { label: "Cerpen", href: "/kategori/cerpen", match: "cerpen" },
  { label: "Novela", href: "/kategori/novela", match: "novela" },
  { label: "Bersiri", href: "/kategori/bersiri", match: "bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen", match: "fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis", match: "sinopsis" }
];

export const NAV_LINKS: { label: string; href: string; match?: string }[] = [
  { label: "Utama", href: "/", match: "home" },
  ...CONTENT_LINKS,
  { label: "Editorial", href: "/editorial", match: "editorial" },
  { label: "Tentang Kami", href: "/tentang", match: "tentang" }
];

export function SiteNavLinks({
  active,
  className,
  links,
  label = "Navigasi utama"
}: {
  active?: string;
  className: string;
  links: { label: string; href: string; match?: string }[];
  label?: string;
}) {
  return (
    <nav className={className} aria-label={label}>
      {links.map((link) => (
        <a
          key={link.href}
          className={active && link.match === active ? "active" : undefined}
          aria-current={active && link.match === active ? "page" : undefined}
          href={link.href}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
