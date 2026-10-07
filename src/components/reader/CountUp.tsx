"use client";

import { useEffect, useRef, useState } from "react";

const format = new Intl.NumberFormat("ms-MY");
const DURATION_MS = 1400;

/**
 * A figure that counts up from 0 the first time it scrolls into view. The server renders the final number, so the page is complete
 * without scripts and for anyone who prefers reduced motion (who never sees the count).
 */
export default function CountUp({ value, delayMs = 0 }: { value: number; delayMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    let timer = 0;
    setShown(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        timer = window.setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION_MS);
            setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }, delayMs);
      },
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delayMs]);

  // The final number, invisible, holds the width so the label beside it never moves while the visible digits change.
  const final = format.format(value);
  return (
    <span ref={ref} className="count-up" aria-label={final}>
      <span className="count-up-size" aria-hidden="true">{final}</span>
      <span className="count-up-now" aria-hidden="true">{format.format(shown)}</span>
    </span>
  );
}
