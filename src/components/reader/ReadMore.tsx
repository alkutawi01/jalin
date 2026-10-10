"use client";

import { useState } from "react";
import type { StoryCard } from "../../lib/reader/story-collection";
import { WorkCover } from "./WorkCover";

/**
 * "Baca lagi" at the end of a story: two other pieces to read, chosen at random, and a button for two more. It is not "what comes next"
 * (a story has no sequel on this page), so it says what it is: more to read.
 */
export default function ReadMore({ initial, exceptSlug }: { initial: StoryCard[]; exceptSlug: string }) {
  const [cards, setCards] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function refresh() {
    if (loading) return;
    setLoading(true);
    setStatus("");
    try {
      const seen = encodeURIComponent(cards.map((card) => card.key).join(","));
      const response = await fetch(`/api/koleksi-cerita?n=2&kecuali=${encodeURIComponent(exceptSlug)}&lihat=${seen}`, { cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      const next = data && typeof data === "object" && Array.isArray((data as { cards?: unknown }).cards) ? (data as { cards: StoryCard[] }).cards : null;
      if (!response.ok || !next || next.length === 0) throw new Error("bad response");
      setCards(next);
      setStatus("Bacaan lain dimuatkan.");
    } catch {
      setStatus("Bacaan lain tidak dapat dimuatkan.");
    } finally {
      setLoading(false);
    }
  }

  if (cards.length === 0) return null;
  const sizes = cards.length === 1
    ? "(max-width: 620px) calc(100vw - 40px), 580px"
    : "(max-width: 500px) calc(100vw - 40px), (max-width: 820px) 45vw, (max-width: 1244px) 47vw, 580px";
  return (
    <section className="related-works" aria-labelledby="baca-lagi-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="baca-lagi-title">Baca lagi</h2>
          <button type="button" className="collection-refresh" onClick={refresh} disabled={loading} aria-busy={loading} aria-label="Tunjukkan dua bacaan lain">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span>{loading ? "Memuatkan…" : "Lain"}</span>
          </button>
        </header>
        <div className={`related-works-grid${cards.length === 1 ? " related-works-grid-single" : ""}`}>
          {cards.map((card) => (
            <a key={card.key} className="related-work-card" href={card.href}>
              <div className="related-work-cover">
                <WorkCover type={card.type} title={card.title} hero={card.hero} sizes={sizes} quality={85} rightsYear={card.year} />
              </div>
              <div className="related-work-body">
                <span className="related-work-kind">{card.eyebrow}</span>
                <h3 style={{ fontStyle: "normal" }}>{card.title}</h3>
                {card.seriesTitle ? <p>Daripada {card.seriesTitle}</p> : null}
                {card.dek ? <p>{card.dek}</p> : null}
                {card.readingMinutes ? <span>± {card.readingMinutes} minit</span> : null}
              </div>
            </a>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        {status.startsWith("Bacaan lain tidak") ? <p className="collection-error" aria-hidden="true">{status}</p> : null}
      </div>
    </section>
  );
}
