export const NAV_LINKS: { label: string; href: string; match?: string }[] = [
  { label: "Utama", href: "/", match: "home" },
  { label: "Cerpen", href: "/kategori/cerpen", match: "cerpen" },
  { label: "Novela", href: "/kategori/novela", match: "novela" },
  { label: "Bersiri", href: "/kategori/bersiri", match: "bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen", match: "fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis", match: "sinopsis" }
];

/** Search is an icon beside the Jalin wordmark in the header, not a word in the menu. */
export const SEARCH_HREF = "/cari";

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
