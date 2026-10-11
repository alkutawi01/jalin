"use client";

import { useEffect, useState } from "react";

/**
 * A round arrow that appears once the reader is well down a page and takes them back to the top. It stays out of the way near the top,
 * is a real button (keyboard and screen reader), and scrolls smoothly unless the reader asked for less motion.
 */
export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    function update() {
      setShown(window.scrollY > Math.max(900, window.innerHeight * 1.2));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function toTop() {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className={"back-to-top" + (shown ? " is-shown" : "")}
      onClick={toTop}
      aria-label="Naik ke atas"
      title="Naik ke atas"
      tabIndex={shown ? 0 : -1}
      aria-hidden={shown ? undefined : true}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
