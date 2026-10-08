"use client";

import { useEffect, useState, type ReactNode } from "react";
import { linkLabels } from "./link-labels";
import { usePathname } from "next/navigation";
import DialogHost from "./DialogHost";
import { confirmAction } from "../../lib/admin/dialogs";
import { can, type Permission, type Role } from "../../lib/admin/permissions";

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
  plus: <path d="M12 5v14M5 12h14" />
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
  { href: "/admin/settings", label: "Tetapan", icon: "settings", match: (p) => p.startsWith("/admin/settings"), needs: "site.manage" },
  // The chief editor has no access to the rest of Tetapan, only to this one panel (the owner has it as a tab of Tetapan).
  { href: "/admin/settings/saiz-teks", label: "Saiz teks karya", icon: "settings", match: (p) => p.startsWith("/admin/settings"), needs: "typography.manage", unless: "site.manage" }
];

export default function AdminShell({ children, role = "owner" }: { children: ReactNode; role?: Role }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Forms are drawn and redrawn by the pages themselves; tie each label to its box whenever the page changes.
  useEffect(() => {
    linkLabels(document);
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; linkLabels(document); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/ubah-kata-laluan")) return <>{children}</>;

  const nav = (
    <>
      <a href="/admin/works/add" className="a-btn a-btn-primary a-add">
        <Icon name="plus" /> Tambah karya
      </a>
      <nav className="a-nav" aria-label="Navigasi admin">
        {NAV.filter((item) => (!item.needs || can(role, item.needs)) && !(item.unless && can(role, item.unless))).map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`a-nav-link${item.match(pathname) ? " is-active" : ""}`}
            aria-current={item.match(pathname) ? "page" : undefined}
          >
            <Icon name={item.icon} />
            {item.label}
          </a>
        ))}
      </nav>
      <div className="a-side-foot">
        <a href="/" className="a-nav-link">
          Laman awam →
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
          <button type="submit" className="a-nav-link a-nav-button">
            Log keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="a-shell">
      <DialogHost />
      <aside className="a-side">
        <a href="/admin" className="a-brand" aria-label="Jalin Admin">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
          <span className="a-brand-tag">Admin</span>
        </a>
        {nav}
      </aside>

      <header className="a-topbar">
        <a href="/admin" className="a-brand" aria-label="Jalin Admin">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
          <span className="a-brand-tag">Admin</span>
        </a>
        <button
          type="button"
          className="a-btn a-btn-quiet"
          aria-expanded={open}
          aria-controls="a-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Tutup" : "Menu"}
        </button>
      </header>
      {open ? (
        <div id="a-drawer" className="a-drawer">
          {nav}
        </div>
      ) : null}

      <main className="a-main">
        <div className="a-container">{children}</div>
      </main>
    </div>
  );
}
