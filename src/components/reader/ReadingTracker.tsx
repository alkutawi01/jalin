"use client";

import { useEffect } from "react";
import { loadWho } from "./HeaderAccount";

type Prefs = { fontSizePx: number; lineHeightX100: number; textWidthCh: number; theme: "cerah" | "sepia" | "gelap"; fontFamily: "serif" | "sans"; dimPercent: number };

const THEMES: Record<Prefs["theme"], { bg: string; fg: string }> = {
  cerah: { bg: "", fg: "" },
  sepia: { bg: "#f1e4cc", fg: "#3b2f1e" },
  gelap: { bg: "#17191a", fg: "#e7e2d8" },
};

/** The reader's own settings as one style rule on the text of the work; nothing when they are the site's defaults. */
function prefsCss(p: Prefs): string {
  const t = THEMES[p.theme] ?? THEMES.cerah;
  const family = p.fontFamily === "sans" ? 'var(--font-inter), Inter, ui-sans-serif, sans-serif' : 'Georgia, "Times New Roman", serif';
  const rules = [
    `.story-body { font-size: ${p.fontSizePx}px !important; line-height: ${p.lineHeightX100 / 100} !important; max-width: ${p.textWidthCh}ch; font-family: ${family}; ${t.fg ? `color: ${t.fg} !important;` : ""} ${p.dimPercent ? `filter: brightness(${1 - p.dimPercent / 100});` : ""} }`,
  ];
  if (t.bg) rules.push(`body { background: ${t.bg}; }`, `.story-body p, .story-body li, .story-body h2, .story-body h3 { color: ${t.fg} !important; }`);
  return rules.join("\n");
}

/**
 * Draws nothing. For a signed-in reader it (1) remembers the place for "Bacaan saya" and (2) puts the reader's own reading settings
 * (size, spacing, width, theme, typeface, dimming) on the text. A visitor sends nothing and sees the site's defaults.
 */
export default function ReadingTracker({ slug, sectionSlug }: { slug: string; sectionSlug?: string }) {
  useEffect(() => {
    let alive = true;
    let style: HTMLStyleElement | null = null;
    loadWho().then(async (who) => {
      if (!alive || !who.signedIn) return;
      fetch("/api/akaun/bacaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, sectionSlug: sectionSlug ?? null }),
        keepalive: true,
      }).catch(() => undefined);
      try {
        const response = await fetch("/api/akaun/tetapan", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok || !alive) return;
        const data = await response.json();
        if (!data.prefs) return;
        style = document.createElement("style");
        style.setAttribute("data-reader-prefs", "");
        style.textContent = prefsCss(data.prefs as Prefs);
        document.head.appendChild(style);
      } catch { /* the site's defaults stay */ }
    });
    return () => { alive = false; style?.remove(); };
  }, [slug, sectionSlug]);
  return null;
}
