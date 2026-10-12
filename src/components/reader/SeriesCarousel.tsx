"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Slides the reader moves themselves: swipe on a phone, the arrows or the arrow keys on a computer. It never moves on its own,
 * because the hero above it already does and two moving things would pull at the reader's eye. One slide fills the width, as the
 * single card did before. With one slide there is nothing to slide, so no controls are drawn.
 */
export default function SeriesCarousel({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const update = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }, [count]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const target = Math.min(count - 1, Math.max(0, to));
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target * el.clientWidth, behavior: calm ? "auto" : "smooth" });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
  }

  if (count <= 1) return <>{slides}</>;

  return (
    <div className="series-carousel" role="group" aria-roledescription="carousel" aria-label={label}>
      <div className="series-carousel-track" ref={track} onScroll={update} onKeyDown={onKeyDown} tabIndex={0}>
        {slides.map((slide, i) => (
          <div className="series-carousel-slide" key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} daripada ${count}`} aria-hidden={i !== index ? true : undefined} inert={i !== index}>
            {slide}
          </div>
        ))}
      </div>
      <div className="series-carousel-controls">
        <button type="button" className="series-carousel-arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Sebelumnya">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="series-carousel-dots">
          {slides.map((_, i) => (
            <button key={i} type="button" className={"series-carousel-dot" + (i === index ? " is-active" : "")} onClick={() => go(i)} aria-label={`Ke ${i + 1} daripada ${count}`} aria-current={i === index ? "true" : undefined} />
          ))}
        </div>
        <button type="button" className="series-carousel-arrow" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Seterusnya">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
