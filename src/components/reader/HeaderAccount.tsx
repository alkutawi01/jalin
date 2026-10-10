"use client";

import { useEffect, useState } from "react";

type Who =
  | { signedIn: false }
  | { signedIn: true; name: string; state: "trial" | "subscribed" | "expired" | "none"; endsAt: string | null };

let pending: Promise<Who> | null = null;

/** Asked once per page load; the header and the phone menu share the answer. Never cached by the browser (the API says no-store). */
function loadWho(): Promise<Who> {
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

/**
 * The visitor sees "Log masuk"; a signed-in reader sees their name and the state of their access, both leading to the right page.
 * Drawn after load so the public pages stay cacheable. Until the answer arrives it holds its place and shows nothing.
 */
export default function HeaderAccount({ variant = "bar", next }: { variant?: "bar" | "menu"; next?: string }) {
  const [who, setWho] = useState<Who | null>(null);
  const [path, setPath] = useState("");

  useEffect(() => {
    let alive = true;
    loadWho().then((answer) => { if (alive) setWho(answer); });
    setPath(next ?? window.location.pathname);
    return () => { alive = false; };
  }, [next]);

  const className = variant === "menu" ? "header-account header-account--menu" : "header-account";
  if (!who) return <span className={className + " is-pending"} aria-hidden="true">Log masuk</span>;

  if (!who.signedIn) {
    const skip = path === "" || path.startsWith("/log-masuk") || path === "/";
    const href = skip ? "/log-masuk" : "/log-masuk?next=" + encodeURIComponent(path);
    return <a className={className} href={href}>Log masuk</a>;
  }

  const left = who.state === "trial" || who.state === "subscribed" ? daysLeft(who.endsAt) : null;
  const detail = STATE_LABEL[who.state] + (left !== null && left <= 7 ? " · " + left + " hari lagi" : "");
  return (
    <a className={className + " header-account--in"} href="/akaun" aria-label={"Akaun " + who.name + ", " + detail}>
      <span className="header-account-name">{who.name}</span>
      <span className={"header-account-state header-account-state--" + who.state}>{detail}</span>
    </a>
  );
}
