"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadWho } from "./HeaderAccount";
import { ACCOUNT_THEME_KEY, THEME_BAR_COLOURS, THEME_KEY, chosenTheme, resolveTheme, type ThemeChoice } from "../../lib/site-theme-mode";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Puts the theme on <html>. The admin is never themed. Exported so the account page changes the look at once. */
export function applyTheme(choice: ThemeChoice = chosenTheme(read(THEME_KEY), read(ACCOUNT_THEME_KEY))): void {
  const root = document.documentElement;
  if (window.location.pathname.startsWith("/admin")) {
    root.removeAttribute("data-theme");
    root.removeAttribute("data-theme-choice");
    return;
  }
  const theme = resolveTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-choice", choice);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => { meta.setAttribute("content", THEME_BAR_COLOURS[theme]); meta.removeAttribute("media"); });
}

/**
 * Draws nothing. Keeps the theme right after the first paint: follows the device while the choice is "sistem", and learns the signed-in
 * reader's saved theme (a visitor has none, so an account's theme never carries over to the next person on this browser).
 */
export default function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => { applyTheme(); }, [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    query.addEventListener("change", onChange);
    let alive = true;
    loadWho().then(async (who) => {
      if (!alive) return;
      try {
        if (!who.signedIn) { localStorage.removeItem(ACCOUNT_THEME_KEY); applyTheme(); return; }
        const response = await fetch("/api/akaun/tetapan", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok || !alive) return;
        const theme = (await response.json()).prefs?.theme;
        if (theme === "cerah" || theme === "sepia" || theme === "gelap") localStorage.setItem(ACCOUNT_THEME_KEY, theme);
        applyTheme();
      } catch { /* the theme already on the page stays */ }
    });
    return () => { alive = false; query.removeEventListener("change", onChange); };
  }, []);
  return null;
}
