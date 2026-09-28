export const NAV_LINKS: { label: string; href: string; match?: string }[] = [
  { label: "Utama", href: "/" },
  { label: "Cerpen", href: "/kategori/cerpen", match: "cerpen" },
  { label: "Novela", href: "/kategori/novela", match: "novela" },
  { label: "Bersiri", href: "/kategori/bersiri", match: "bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen", match: "fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis", match: "sinopsis" }
];

export function SiteNavLinks({
  active,
  className,
  links
}: {
  active?: string;
  className: string;
  links: { label: string; href: string; match?: string }[];
}) {
  return (
    <nav className={className} aria-label="Navigasi utama">
      {links.map((link) => (
        <a
          key={link.href}
          className={active && link.match === active ? "active" : undefined}
          href={link.href}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
