"use client";

import { useEffect, useRef } from "react";
import { readingProgress } from "../../lib/reader/reading-progress";

/**
 * A thin line along the top of the screen that fills as the reader scrolls through the story text (".story-body").
 * It is only a picture of where the reader is, so screen readers skip it; with no text on the page, or a text shorter than the screen,
 * nothing is drawn.
 */
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const text = document.querySelector<HTMLElement>(".story-body");
    const bar = barRef.current;
    const root = rootRef.current;
    if (!text || !bar || !root) return;
    let queued = false;

    function draw() {
      queued = false;
      const box = text!.getBoundingClientRect();
      const progress = readingProgress(window.scrollY, box.top + window.scrollY, box.height, window.innerHeight);
      root!.style.display = progress === null ? "none" : "block";
      if (progress !== null) bar!.style.transform = `scaleX(${progress})`;
    }
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(draw);
    }

    draw();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queue);
    observer?.observe(text);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="reading-progress" aria-hidden="true" style={{ display: "none" }}>
      <div ref={barRef} className="reading-progress-bar" />
    </div>
  );
}
