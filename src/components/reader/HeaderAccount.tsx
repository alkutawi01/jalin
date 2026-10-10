"use client";

import { useEffect, useRef, useState } from "react";

export type Who =
  | { signedIn: false }
  | { signedIn: true; name: string; state: "trial" | "subscribed" | "expired" | "none"; endsAt: string | null };

let pending: Promise<Who> | null = null;

/** Asked once per page load; the header, the phone menu and the reading tracker share the answer. Never cached by the browser. */
export function loadWho(): Promise<Who> {
  if (!pending) {
    pending = fetch("/api/akaun/saya", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { signedIn: false } as Who;
        const data = await response.json();
        if (!data.signedIn) return { signedIn: false } as Who;
        const email = String(data.account?.email ?? "");
        const name = String(data.account?.displayName || email.split("@")[0] || "Akaun");
        return { signedIn: true, name, state: data.access?.state ?? "none", endsAt: data.access?.endsAt ?? null } as Who;
      })
      .catch(() => ({ signedIn: false }) as Who);
  }
  return pending;
}

const STATE_LABEL: Record<string, string> = { trial: "Percubaan", subscribed: "Aktif", expired: "Tamat", none: "Belum aktif" };

function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86400000));
}

const LINKS = [
  { href: "/akaun", label: "Akaun saya" },
  { href: "/akaun#bacaan", label: "Bacaan saya" },
  { href: "/akaun#langganan", label: "Langganan" },
  { href: "/tebus", label: "Tebus kod" },
];

async function signOut() {
  try { await fetch("/api/akaun/keluar", { method: "POST", credentials: "same-origin" }); } catch { /* the reload shows the real state */ }
  window.location.reload();
}

/**
 * The visitor sees "Log masuk". A signed-in reader sees their name and the state of their access; on a wide screen it opens a small
 * menu (account, reading list, subscription, redeem, sign out), in the phone menu the same entries are listed. Drawn after load so the
 * public pages stay cacheable; until the answer arrives it holds its place and shows nothing.
 */
export default function HeaderAccount({ variant = "bar", next }: { variant?: "bar" | "menu"; next?: string }) {
  const [who, setWho] = useState<Who | null>(null);
  const [path, setPath] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadWho().then((answer) => { if (alive) setWho(answer); });
    setPath(next ?? window.location.pathname);
    return () => { alive = false; };
  }, [next]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const className = variant === "menu" ? "header-account header-account--menu" : "header-account";
  if (!who) return <span className={className + " is-pending"} aria-hidden="true">Log masuk</span>;

  if (!who.signedIn) {
    const skip = path === "" || path.startsWith("/log-masuk") || path === "/";
    const href = skip ? "/log-masuk" : "/log-masuk?next=" + encodeURIComponent(path);
    return <a className={className} href={href}>Log masuk</a>;
  }

  const left = who.state === "trial" || who.state === "subscribed" ? daysLeft(who.endsAt) : null;
  const detail = STATE_LABEL[who.state] + (left !== null && left <= 7 ? " · " + left + " hari lagi" : "");
  const identity = (
    <>
      <span className="header-account-name">{who.name}</span>
      <span className={"header-account-state header-account-state--" + who.state}>{detail}</span>
    </>
  );

  if (variant === "menu") {
    return (
      <div className="header-account-list">
        <div className="header-account--in header-account-who">{identity}</div>
        {LINKS.map((link) => <a key={link.href} className="header-account-link" href={link.href}>{link.label}</a>)}
        <button type="button" className="header-account-link header-account-out" onClick={signOut}>Log keluar</button>
      </div>
    );
  }

  return (
    <div className="header-account-wrap" ref={box}>
      <button type="button" className={className + " header-account--in header-account-button"} aria-haspopup="menu" aria-expanded={open} aria-label={"Menu akaun " + who.name + ", " + detail} onClick={() => setOpen((v) => !v)}>
        <span className="header-account-id">{identity}</span>
        <span className="header-account-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="header-account-menu" role="menu">
          {LINKS.map((link) => <a key={link.href} role="menuitem" href={link.href}>{link.label}</a>)}
          <button type="button" role="menuitem" onClick={signOut}>Log keluar</button>
        </div>
      ) : null}
    </div>
  );
}
