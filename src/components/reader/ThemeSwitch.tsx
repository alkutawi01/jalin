"use client";

import { useEffect, useState } from "react";
import { applyTheme } from "./ThemeSync";
import { THEME_KEY, isThemeChoice, type ThemeChoice } from "../../lib/site-theme-mode";

const CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: "sistem", label: "Ikut peranti" },
  { value: "cerah", label: "Cerah" },
  { value: "sepia", label: "Sepia" },
  { value: "gelap", label: "Gelap" }
];

/**
 * The look of the site, for anyone: follow the device (the default), or Cerah, Sepia or Gelap. The choice is kept in this browser only
 * (nothing is sent anywhere, no account is needed) and wins over the device. A signed-in reader's saved theme is still used until they
 * choose here.
 */
export default function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      setChoice(isThemeChoice(stored) ? stored : (document.documentElement.getAttribute("data-theme-choice") as ThemeChoice | null) ?? "sistem");
    } catch {
      setChoice("sistem");
    }
  }, []);

  function pick(next: ThemeChoice) {
    try { localStorage.setItem(THEME_KEY, next); } catch { /* the look still changes for this visit */ }
    setChoice(next);
    applyTheme(next);
  }

  return (
    <div className="theme-switch" role="group" aria-label="Tema laman">
      <span className="theme-switch-label" aria-hidden="true">Tema</span>
      {CHOICES.map((c) => (
        <button key={c.value} type="button" className="theme-switch-btn" aria-pressed={choice === c.value} onClick={() => pick(c.value)}>{c.label}</button>
      ))}
    </div>
  );
}
