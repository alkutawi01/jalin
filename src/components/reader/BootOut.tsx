"use client";

import { useEffect } from "react";

/**
 * Draws nothing. The inline script in BootScreen lets the loading screen go, but when React has to rebuild a page on the client
 * (a hydration mismatch recovers by rendering again) the loading screen is a new element without the "boot-out" class and the
 * script has already run, so the page stayed covered for ever (found 10 Oct 2026 on /log-masuk, /akaun, /tebus and /mula with
 * accounts switched off). This runs after every commit, finds the screen as it is now, and lets it go once the second has passed.
 */
export default function BootOut() {
  useEffect(() => {
    const el = document.getElementById("boot-screen");
    if (!el || el.classList.contains("boot-out")) return;
    const timer = window.setTimeout(() => el.classList.add("boot-out"), Math.max(0, 1000 - performance.now()));
    return () => window.clearTimeout(timer);
  });
  return null;
}
