import NavMenu from "./NavMenu";

export type NavLeaf = { label: string; href: string; match?: string };
export type NavItem = { label: string; href?: string; match?: string; children?: NavLeaf[] };

/** The five kinds of content: the Kandungan menu opens these, and the footer's "Terokai" column lists them. */
export const CONTENT_LINKS: NavLeaf[] = [
  { label: "Cerpen", href: "/kategori/cerpen", match: "cerpen" },
  { label: "Novela", href: "/kategori/novela", match: "novela" },
  { label: "Bersiri", href: "/kategori/bersiri", match: "bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen", match: "fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis", match: "sinopsis" }
];

export const NAV_LINKS: NavItem[] = [
  { label: "Utama", href: "/", match: "home" },
  { label: "Kandungan", children: CONTENT_LINKS },
  { label: "Editorial", href: "/editorial", match: "editorial" },
  { label: "Tentang Kami", href: "/tentang", match: "tentang" }
];

/** What a visitor without access is shown in the header: the library is for readers with access, so only the information pages. */
export const VISITOR_LINKS: NavItem[] = [
  { label: "Editorial", href: "/editorial", match: "editorial" },
  { label: "Tentang Kami", href: "/tentang", match: "tentang" }
];

/**
 * "bar" is the header on a laptop: Kandungan is a button that opens a menu. "list" is the phone menu: the same five links sit
 * under a plain "Kandungan" label, so nothing is hidden behind a second tap.
 */
export function SiteNavLinks({
  active,
  className,
  links,
  label = "Navigasi utama",
  variant = "bar"
}: {
  active?: string;
  className: string;
  links: NavItem[];
  label?: string;
  variant?: "bar" | "list";
}) {
  return (
    <nav className={className} aria-label={label}>
      {links.map((link) => {
        if (link.children) {
          const children = link.children;
          const groupActive = children.some((child) => child.match === active);
          if (variant === "list") {
            return [
              <span key={`${link.label}-top`} className="nav-sep" role="separator" />,
              <span key={link.label} className="nav-group-label">{link.label}</span>,
              ...children.map((child) => (
                <a
                  key={child.href}
                  className={`nav-group-link${active && child.match === active ? " active" : ""}`}
                  aria-current={active && child.match === active ? "page" : undefined}
                  href={child.href}
                >
                  {child.label}
                </a>
              )),
              <span key={`${link.label}-bottom`} className="nav-sep" role="separator" />
            ];
          }
          return <NavMenu key={link.label} label={link.label} items={children} active={active} groupActive={groupActive} />;
        }
        const current = !!active && link.match === active;
        return (
          <a key={link.href} className={current ? "active" : undefined} aria-current={current ? "page" : undefined} href={link.href}>
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
