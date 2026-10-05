"use client";

import Image from "next/image";
import { smartQuotes } from "../../lib/admin/smart-quotes";
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
 * The editor's picks, one at a time. Moves on by itself every few seconds, stops while the reader points at it,
 * focuses inside it or presses pause, and does not move at all for readers who ask for less motion.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);
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
    if (count < 2 || paused || hovering || reduced) return;
    const timer = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, count, paused, hovering, reduced, go]);

  return (
    <section
      ref={rootRef}
      className="hero-featured hero-carousel"
      aria-roledescription="karusel"
      aria-label="Pilihan Editor"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setHovering(false); }}
    >
      <div className="site-shell">
        <div className="hero-carousel-stack" aria-live={paused || hovering || reduced ? "polite" : "off"}>
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
                  <h1 className="hero-featured-title" style={{ fontStyle: "normal" }}>{work.title}</h1>
                  {work.attribution ? <p className="work-attribution hero-featured-attribution">{renderAttribution(work.attribution)}</p> : null}
                  {work.dek ? <p className="hero-featured-dek">{smartQuotes(work.dek)}</p> : null}
                  <div className="home-work-meta home-work-meta--pills">
                    {work.reading ? <span>{work.reading}</span> : null}
                    <span>{work.date}</span>
                  </div>
                  <a className="home-action-primary hero-featured-cta" href={`/kategori/${work.type}/${work.slug}`}>Baca sekarang</a>
                </div>
                {work.hero?.src ? (
                  <div className="hero-featured-visual">
                    <Image src={work.hero.src} alt={work.hero.alt} fill sizes="(max-width: 680px) 750px, (max-width: 1050px) 100vw, 1000px" quality={85} priority={i === 0} style={cropStyle(work.hero.crop)} />
                    <div className="image-rights" aria-hidden="true">{work.rights}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className="hero-carousel-controls">
            <button type="button" className="hero-carousel-btn" onClick={() => go(index - 1)} aria-label="Sebelumnya">←</button>
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
            <button type="button" className="hero-carousel-btn" onClick={() => go(index + 1)} aria-label="Seterusnya">→</button>
            {!reduced ? (
              <button type="button" className="hero-carousel-btn hero-carousel-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
                {paused ? "Main" : "Jeda"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
