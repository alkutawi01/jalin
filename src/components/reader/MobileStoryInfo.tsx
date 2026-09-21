"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryInfoData } from "./types";

type Tab = "karya" | "watak" | "editorial";

export default function MobileStoryInfo({ data }: { data: StoryInfoData }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("karya");
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const edgeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onTouchStart(event: TouchEvent) {
      if (open || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX >= window.innerWidth - 24) {
        edgeStart.current = { x: touch.clientX, y: touch.clientY };
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (open || !edgeStart.current || event.changedTouches.length !== 1) {
        edgeStart.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const dx = edgeStart.current.x - touch.clientX;
      const dy = Math.abs(edgeStart.current.y - touch.clientY);

      if (dx > 54 && dy < 72) setOpen(true);
      edgeStart.current = null;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [open]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return;
    setDragY(Math.max(0, event.clientY - startY.current));
  }

  function onPointerUp() {
    if (dragY > 110) setOpen(false);
    setDragY(0);
    startY.current = null;
  }

  return (
    <>
      <button
        type="button"
        className="mobile-info-handle"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-story-info"
      >
        Info
      </button>

      {open && (
        <div className="mobile-info-layer">
          <button
            type="button"
            className="mobile-info-backdrop"
            aria-label="Tutup maklumat karya"
            onClick={() => setOpen(false)}
          />
          <section
            id="mobile-story-info"
            className="mobile-info-sheet"
            style={{ transform: \`translateY(\${dragY}px)\` }}
            aria-label="Maklumat karya"
          >
            <div
              className="sheet-drag-zone"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span className="sheet-grabber" />
            </div>

            <div className="sheet-tabs" role="tablist" aria-label="Maklumat cerita">
              <button type="button" className={tab === "karya" ? "active" : ""} onClick={() => setTab("karya")}>Karya</button>
              <button type="button" className={tab === "watak" ? "active" : ""} onClick={() => setTab("watak")}>Watak</button>
              <button type="button" className={tab === "editorial" ? "active" : ""} onClick={() => setTab("editorial")}>Editorial</button>
            </div>

            <div className="sheet-content">
              {tab === "karya" && (
                <dl className="sheet-list">
                  {data.work.map((row) => (
                    <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
                  ))}
                </dl>
              )}

              {tab === "watak" && (
                <div className="sheet-stack">
                  {data.characters.map((character) => (
                    <div key={character.name}><b>{character.name}</b><span>{character.role}</span></div>
                  ))}
                </div>
              )}

              {tab === "editorial" && (
                <div className="sheet-stack">
                  {data.editorial.map((credit) => (
                    <div key={\`\${credit.role}-\${credit.name}\`}><span>{credit.role}</span><b>{credit.name}</b></div>
                  ))}
                  {data.note ? <p className="sheet-note">{data.note}</p> : null}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
