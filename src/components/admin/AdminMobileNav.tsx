"use client";

import { useEffect, useRef, useState } from "react";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/works", label: "Karya" },
  { href: "/admin/series", label: "Siri" },
  { href: "/admin/contributors", label: "Penyumbang" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/prompts", label: "Prompt" },
  { href: "/admin/visual-requests", label: "Visual" },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="admin-mobile-nav-toggle"
        aria-expanded={open}
        aria-controls="admin-mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Tutup" : "Menu"}
      </button>
      {open && (
        <nav
          id="admin-mobile-nav-panel"
          className="admin-mobile-nav-panel"
          aria-label="Navigasi admin"
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="admin-nav-link" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="/" className="admin-nav-link admin-nav-public" onClick={() => setOpen(false)}>
            Laman Awam →
          </a>
          <form action="/api/admin/auth/logout" method="POST" className="admin-nav-form">
            <button type="submit" className="admin-nav-link admin-nav-logout">
              Log Keluar
            </button>
          </form>
        </nav>
      )}
    </>
  );
}
