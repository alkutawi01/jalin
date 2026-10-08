"use client";

import { useState } from "react";
import type { StoryCard } from "../../lib/reader/story-collection";
import { formatMalayDate } from "../../lib/reader/format-date";
import { renderAttribution } from "./Attribution";
import { WorkCover } from "./WorkCover";

function CardMeta({ card }: { card: StoryCard }) {
  const reading = card.readingMinutes ? `± ${card.readingMinutes} minit` : null;
  const published = formatMalayDate(card.publishedAt);
  if (!reading && !published) return null;
  return (
    <div className="home-work-meta home-work-meta--line">
      {reading ? <span>{reading}</span> : null}
      {published ? <span>{published}</span> : null}
    </div>
  );
}

function StoryCardView({ card }: { card: StoryCard }) {
  return (
    <article className="latest-card">
      <a href={card.href}>
        <div className="latest-card-cover">
          <WorkCover type={card.type} title={card.title} hero={card.hero} rightsYear={card.year} />
        </div>
        <div className="latest-card-body">
          <div className="latest-card-meta">
            <span className="home-eyebrow latest-card-type">{card.eyebrow}</span>
          </div>
          <h3 className="latest-card-title" style={{ fontStyle: "normal" }}>{card.title}</h3>
          {card.seriesTitle ? <p className="latest-card-series">Daripada {card.seriesTitle}</p> : null}
          {card.attribution ? <p className="work-attribution">{renderAttribution(card.attribution.primary)}</p> : null}
          {card.attribution?.secondary ? <p className="work-attribution-source">{renderAttribution(card.attribution.secondary)}</p> : null}
          {card.dek ? <p className="latest-card-dek">{card.dek}</p> : null}
          <CardMeta card={card} />
          <div className="latest-card-footer">
            <span className="home-action-text latest-card-cta">Baca sekarang</span>
          </div>
        </div>
      </a>
    </article>
  );
}

/** The homepage "Koleksi cerita": a random set of stories (series episodes included) and a button for another set. */
export default function StoryCollection({ initial, ground }: { initial: StoryCard[]; ground?: string }) {
  const [cards, setCards] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function refresh() {
    if (loading) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/koleksi-cerita?lihat=${encodeURIComponent(cards.map((card) => card.key).join(","))}`, { cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      const next = data && typeof data === "object" && Array.isArray((data as { cards?: unknown }).cards) ? ((data as { cards: StoryCard[] }).cards) : null;
      if (!response.ok || !next || next.length === 0) throw new Error("bad response");
      setCards(next);
      setStatus("Koleksi cerita dikemas kini.");
    } catch {
      setStatus("Cerita lain tidak dapat dimuatkan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="latest-works" data-ground={ground} aria-labelledby="koleksi-cerita-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="koleksi-cerita-title">Koleksi cerita</h2>
          <button type="button" className="collection-refresh" onClick={refresh} disabled={loading} aria-busy={loading}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span>{loading ? "Memuatkan…" : "Cerita lain"}</span>
          </button>
        </header>
        <div className="latest-grid">
          {cards.map((card) => <StoryCardView key={card.key} card={card} />)}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        {status && status.startsWith("Cerita lain") ? <p className="collection-error" aria-hidden="true">{status}</p> : null}
      </div>
    </section>
  );
}
