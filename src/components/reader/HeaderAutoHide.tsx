"use client";

import { useEffect } from "react";

/** Scrolled this far down the page the header may tuck away (a reader who is reading, not looking for the menu). */
const HIDE_AFTER = 240;
/** Under this the header is always there. */
const ALWAYS_BELOW = 120;
/** A move smaller than this is ignored, so a trackpad's small shake does not flicker the header. */
const MIN_STEP = 6;

/**
 * Tucks the header away while the reader scrolls down a page and brings it back as soon as they scroll up, so the menu is never
 * far but does not sit over the text. It stays when the reader is using it: search open, the phone menu open, focus inside it,
 * or a dialog or sheet holding the page. Renders nothing; it only toggles a class on the header.
 */
export default function HeaderAutoHide() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let last = window.scrollY;
    let ticking = false;

    function inUse(): boolean {
      if (!header) return false;
      if (header.matches(":focus-within")) return true;
      if (header.querySelector(".header-search-field:not(.closing)")) return true;
      if (header.querySelector("details[open]")) return true;
      if (document.documentElement.style.overflow === "hidden") return true;
      return false;
    }

    function update() {
      ticking = false;
      if (!header) return;
      const y = window.scrollY;
      const delta = y - last;
      if (y < ALWAYS_BELOW || inUse()) {
        header.classList.remove("is-tucked");
        last = y;
        return;
      }
      if (Math.abs(delta) < MIN_STEP) return;
      if (delta > 0 && y > HIDE_AFTER) header.classList.add("is-tucked");
      else if (delta < 0) header.classList.remove("is-tucked");
      last = y;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    function reveal() { header?.classList.remove("is-tucked"); }

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("focusin", reveal);
      header.classList.remove("is-tucked");
    };
  }, []);

  return null;
}
