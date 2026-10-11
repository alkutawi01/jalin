"use client";

import { useEffect, useState } from "react";
import type { StoryCard } from "../../lib/reader/story-collection";
import { StoryCardView } from "./StoryCollection";

/** The most cards a row holds (a desktop row); a tablet or phone shows the first two and CSS hides the rest. */
const MAX_PER_VIEW = 3;

/**
 * "Baca lagi" at the end of a story: other pieces to read, and a button for more. It is not "what comes next"
 * (a story has no sequel on this page), so it says what it is: more to read.
 *
 * The page brings a handful of candidates and the button turns through them in the browser, so a click costs the server and the
 * database nothing and the new set appears at once. `exceptSlug` is kept for the markup that calls this.
 */
export default function ReadMore({ initial }: { initial: StoryCard[]; exceptSlug: string }) {
  const [start, setStart] = useState(0);
  const [step, setStep] = useState(MAX_PER_VIEW);
  const [status, setStatus] = useState("");

  // How many cards the row really shows: three on a desktop, two below 1051px (the same break the layout uses).
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1051px)");
    const apply = () => setStep(query.matches ? MAX_PER_VIEW : 2);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  if (initial.length === 0) return null;
  const shown = Math.min(MAX_PER_VIEW, initial.length);
  const cards = Array.from({ length: shown }, (_, i) => initial[(start + i) % initial.length]!);
  const canTurn = initial.length > step;

  function next() {
    setStart((current) => (current + step) % initial.length);
    setStatus("Bacaan lain ditunjukkan.");
  }

  return (
    <section className="related-works" aria-labelledby="baca-lagi-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="baca-lagi-title">Baca lagi</h2>
          {canTurn ? (
            <button type="button" className="collection-refresh" onClick={next} aria-label="Tunjukkan bacaan lain">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              <span>Lain</span>
            </button>
          ) : null}
        </header>
        <div className={`latest-grid related-works-grid${cards.length === 1 ? " related-works-grid-single" : ""}`}>
          {cards.map((card) => <StoryCardView key={card.key} card={card} />)}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
      </div>
    </section>
  );
}
