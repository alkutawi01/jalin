"use client";

import Image from "next/image";
import { smartQuotes } from "../../lib/admin/smart-quotes";
import { spacedDashes } from "../../lib/reader/spaced-dash";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderAttribution } from "./Attribution";
import { cropStyle } from "../../lib/reader/crop";
import type { ImageCrop } from "../../lib/content/types";

export interface HeroSlide {
  slug: string;
  type: string;
  title: string;
  kicker: string;
  attribution?: string;
  dek?: string;
  reading?: string;
  date: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  rights: string;
}

const INTERVAL_MS = 6000;

/**
 * The editor's picks, one at a time. Moves on by itself every few seconds. It stops while a mouse rests on it, while a finger or
 * button is held down on a slide or a dot, and while focus is inside it; there is no pause button. It does not move at all for
 * readers who ask for less motion.
 */
export default function HeroCarousel({ slides, ground }: { slides: HeroSlide[]; ground?: string }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [holding, setHolding] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stopped = hovering || holding || focused;
  const rootRef = useRef<HTMLElement>(null);
  const count = slides.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || stopped || reduced) return;
    const timer = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, count, stopped, reduced, go]);

  // A hold ends wherever the finger or button is let go, even outside the carousel.
  useEffect(() => {
    if (!holding) return;
    const release = () => setHolding(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [holding]);

  return (
    <section
      ref={rootRef}
      className="hero-featured hero-carousel"
      data-ground={ground}
      aria-roledescription="karusel"
      aria-label="Pilihan Editor"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovering(true); }}
      onPointerLeave={() => setHovering(false)}
      onPointerDown={() => setHolding(true)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    >
      <div className="site-shell">
        <div className="hero-carousel-stack" aria-live={stopped || reduced ? "polite" : "off"}>
          {slides.map((work, i) => {
            const active = i === index;
            return (
              <div
                key={work.slug}
                className={`hero-featured-inner hero-carousel-slide${work.hero?.src ? "" : " hero-featured-text-only"}${active ? " is-active" : ""}`}
                role="group"
                aria-roledescription="slaid"
                aria-label={`${i + 1} daripada ${count}`}
                aria-hidden={!active}
                inert={!active}
              >
                <div className="hero-featured-text">
                  <p className="home-eyebrow hero-featured-kicker">{work.kicker}</p>
                  {/* The page has one h1: the first slide's title. The other slides are h2, so a screen reader's heading list is not three h1s. */}
                  {i === 0 ? (
                    <h1 className="hero-featured-title" style={{ fontStyle: "normal" }}>{work.title}</h1>
                  ) : (
                    <h2 className="hero-featured-title" style={{ fontStyle: "normal" }}>{work.title}</h2>
                  )}
                  {work.attribution ? <p className="work-attribution hero-featured-attribution">{renderAttribution(work.attribution)}</p> : null}
                  {work.dek ? <p className="hero-featured-dek">{spacedDashes(smartQuotes(work.dek))}</p> : null}
                  <div className="home-work-meta home-work-meta--pills">
                    {work.reading ? <span>{work.reading}</span> : null}
                    <span>{work.date}</span>
                  </div>
                  <a className="home-action-primary hero-featured-cta" href={`/kategori/${work.type}/${work.slug}`}>Baca sekarang</a>
                </div>
                {work.hero?.src ? (
                  <div className="hero-featured-visual">
                    <Image src={work.hero.src} alt={work.hero.alt} fill sizes="(max-width: 680px) 750px, (max-width: 1050px) 100vw, 1000px" quality={85} priority={i === 0} loading={i === 0 ? undefined : "eager"} fetchPriority={i === 0 ? undefined : "low"} style={cropStyle(work.hero.crop)} />
                    <div className="image-rights" aria-hidden="true">{work.rights}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className="hero-carousel-controls">
            <button type="button" className="hero-carousel-btn" onClick={() => go(index - 1)} aria-label="Sebelumnya"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <div className="hero-carousel-dots" role="group" aria-label="Pilih slaid">
              {slides.map((work, i) => (
                <button
                  key={work.slug}
                  type="button"
                  className={`hero-carousel-dot${i === index ? " is-active" : ""}`}
                  onClick={() => go(i)}
                  aria-label={`Slaid ${i + 1}: ${work.title}`}
                  aria-current={i === index}
                />
              ))}
            </div>
            <button type="button" className="hero-carousel-btn" onClick={() => go(index + 1)} aria-label="Seterusnya"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
