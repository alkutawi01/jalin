"use client";

import { useEffect, useState, type ReactNode } from "react";
import { linkLabels } from "./link-labels";
import { labelTableCells } from "./table-labels";
import { usePathname } from "next/navigation";
import DialogHost from "./DialogHost";
import { confirmAction } from "../../lib/admin/dialogs";
import { can, type Permission, type Role } from "../../lib/admin/permissions";
import { isSessionExpiredAnswer, SESSION_BANNER } from "../../lib/admin/session-expiry";

/**
 * Admin app shell: a sidebar on wide screens, a top bar with a drawer on
 * narrow ones. The login page is shown without any chrome.
 *
 * Logo rule (public/brand/README.md, LOCKED): the header uses the approved
 * jalin-wordmark.svg as-is. It is never redrawn, recoloured, cropped or
 * re-set in a font. It sits on the light paper surface it was made for, with
 * clear space around it. "Admin" is a separate label beside it, not part of it.
 */

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  works: <path d="M6 3.5h9l3 3V20.5H6zM14.5 3.5V7H18M9 12h6M9 15.5h6" />,
  people: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16.5 5a3 3 0 0 1 0 6M18 14.5c1.8.7 3 2.4 3 4.5" />,
  series: <path d="M5 8.5h12v11H5zM8 5.5h12v11" />,
  settings: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4.5v5M8 14.5v5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  clock: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />,
  panel: <path d="M4 5.5h16v13H4zM9.5 5.5v13" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />,
  logout: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="a-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const NAV: { href: string; label: string; icon: keyof typeof ICONS; match: (p: string) => boolean; needs?: Permission; unless?: Permission }[] = [
  { href: "/admin", label: "Papan pemuka", icon: "home", match: (p) => p === "/admin" },
  {
    href: "/admin/works",
    label: "Karya",
    icon: "works",
    match: (p) => (p.startsWith("/admin/works") && !p.startsWith("/admin/works/add")) || p.startsWith("/admin/visual-requests")
  },
  { href: "/admin/series", label: "Siri", icon: "series", match: (p) => p.startsWith("/admin/series") },
  { href: "/admin/contributors", label: "Penyumbang", icon: "people", match: (p) => p.startsWith("/admin/contributors"), needs: "contributor.manage" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "people", match: (p) => p.startsWith("/admin/pengguna"), needs: "user.manage" },
  { href: "/admin/aktiviti", label: "Aktiviti", icon: "clock", match: (p) => p.startsWith("/admin/aktiviti"), needs: "activity.read" },
  { href: "/admin/settings", label: "Tetapan", icon: "settings", match: (p) => p.startsWith("/admin/settings"), needs: "site.manage" },
  // The chief editor has no access to the rest of Tetapan, only to this one panel (the owner has it as a tab of Tetapan).
  { href: "/admin/settings/saiz-teks", label: "Saiz teks karya", icon: "settings", match: (p) => p.startsWith("/admin/settings"), needs: "typography.manage", unless: "site.manage" }
];

const MENU_KEY = "jalin-admin-menu";

export default function AdminShell({ children, role = "owner" }: { children: ReactNode; role?: Role }) {
  const pathname = usePathname() ?? "";
  // The side menu: open, closed, or null = no choice made yet (the stylesheet then closes it on a window under 1100px).
  const [menu, setMenu] = useState<"open" | "closed" | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // The first answer of the admin API that says "the session has ended" raises the banner (see session-expiry.ts).
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      try {
        const input = args[0];
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (isSessionExpiredAnswer(url, response.status)) setSessionEnded(true);
      } catch {
        /* the banner is a convenience; never break a request over it */
      }
      return response;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  // What the editor chose last time is kept (on a window of 900px or more; under that the menu lies over the page and is never kept open).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MENU_KEY);
      if ((saved === "open" || saved === "closed") && window.innerWidth >= 900) setMenu(saved);
    } catch {
      /* the choice is a convenience; without storage the menu follows the width */
    }
    const query = window.matchMedia("(max-width: 1099px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  // A menu opened over a narrow page closes when the editor goes somewhere, and on Escape.
  useEffect(() => {
    if (window.innerWidth < 900) setMenu((current) => (current === "open" ? "closed" : current));
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && window.innerWidth < 900 && setMenu((current) => (current === "open" ? "closed" : current));
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Forms and tables are drawn and redrawn by the pages themselves; tie each label to its box, and name each table cell after its column
  // (the phone layout shows a table as cards), whenever the page changes.
  useEffect(() => {
    const tidy = () => { linkLabels(document); labelTableCells(document); };
    tidy();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; tidy(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/ubah-kata-laluan")) return <>{children}</>;

  // Closed = icons only. With no choice made, the stylesheet closes the menu on a window under 1100px, and so does this.
  const collapsed = menu === "closed" || (menu === null && narrow);
  function toggleMenu() {
    const next = collapsed ? "open" : "closed";
    setMenu(next);
    try {
      if (window.innerWidth >= 900) window.localStorage.setItem(MENU_KEY, next);
    } catch {
      /* the choice is a convenience */
    }
  }

  return (
    <div className="a-shell" data-menu={menu ?? undefined}>
      <DialogHost />
      <aside className="a-side" aria-label="Menu admin">
        <div className="a-side-head">
          <a href="/admin" className="a-brand" aria-label="Jalin Admin">
            <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
            <span className="a-brand-tag">Admin</span>
          </a>
          <button
            type="button"
            className="a-side-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Buka menu" : "Tutup menu"}
            title={collapsed ? "Buka menu" : "Tutup menu"}
            onClick={toggleMenu}
          >
            <Icon name="panel" />
          </button>
        </div>
        <a href="/admin/works/add" className="admin-btn admin-btn-primary a-add" title="Tambah karya">
          <Icon name="plus" /> <span className="a-nav-label">Tambah karya</span>
        </a>
        <nav className="a-nav" aria-label="Navigasi admin">
          {NAV.filter((item) => (!item.needs || can(role, item.needs)) && !(item.unless && can(role, item.unless))).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`a-nav-link${item.match(pathname) ? " is-active" : ""}`}
              aria-current={item.match(pathname) ? "page" : undefined}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className="a-nav-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="a-side-foot">
          <a href="/" className="a-nav-link" title="Laman awam">
            <Icon name="external" />
            <span className="a-nav-label">Laman awam</span>
          </a>
          <form
            action="/api/admin/auth/logout"
            method="POST"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (await confirmAction("Log keluar daripada admin?", { confirmLabel: "Log keluar" })) form.submit();
            }}
          >
            <button type="submit" className="a-nav-link a-nav-button" title="Log keluar">
              <Icon name="logout" />
              <span className="a-nav-label">Log keluar</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="a-main">
        {sessionEnded ? (
          <div className="a-session-banner" role="alert">
            <p>
              <strong>{SESSION_BANNER.title}</strong> {SESSION_BANNER.body}
            </p>
            <div className="a-session-banner-actions">
              <a className="admin-btn admin-btn-primary admin-btn-sm" href="/admin/login" target="_blank" rel="noopener">{SESSION_BANNER.link}</a>
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setSessionEnded(false)}>{SESSION_BANNER.dismiss}</button>
            </div>
          </div>
        ) : null}
        <div className="a-container">{children}</div>
      </main>
    </div>
  );
}
