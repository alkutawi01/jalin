"use client";

import { useEffect, useState } from "react";
import { loadWho } from "./HeaderAccount";

/** A small bookmark at the corner of a work for a signed-in reader: keep it for later, or take it off. A visitor never sees it. */
export default function SaveWorkButton({ slug }: { slug: string }) {
  const [state, setState] = useState<"hidden" | "off" | "on">("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    loadWho().then(async (who) => {
      if (!alive || !who.signedIn) return;
      try {
        const response = await fetch("/api/akaun/simpan?slug=" + encodeURIComponent(slug), { credentials: "same-origin", cache: "no-store" });
        if (!response.ok || !alive) return;
        const data = await response.json();
        setState(data.saved ? "on" : "off");
      } catch { /* the button just stays away */ }
    });
    return () => { alive = false; };
  }, [slug]);

  if (state === "hidden") return null;
  const saved = state === "on";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/akaun/simpan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, saved: !saved }) });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) setState(data.saved ? "on" : "off");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={"save-work" + (saved ? " is-saved" : "")} aria-pressed={saved} aria-label={saved ? "Keluarkan daripada Disimpan" : "Simpan karya ini"} title={saved ? "Disimpan. Klik untuk keluarkan." : "Simpan untuk kemudian"} onClick={toggle} disabled={busy}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h10v18l-5-4-5 4z" /></svg>
      <span>{saved ? "Disimpan" : "Simpan"}</span>
    </button>
  );
}
