"use client";

import { useRef, useState } from "react";

type Tab = "karya" | "watak" | "editorial";

export default function MobileStoryInfo() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("karya");
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return;
    setDragY(Math.max(0, event.clientY - startY.current));
  }

  function onPointerUp() {
    if (dragY > 110) {
      setOpen(false);
    }
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
            style={{ transform: `translateY(${dragY}px)` }}
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
              <button type="button" className={tab === "karya" ? "active" : ""} onClick={() => setTab("karya")}>
                Karya
              </button>
              <button type="button" className={tab === "watak" ? "active" : ""} onClick={() => setTab("watak")}>
                Watak
              </button>
              <button type="button" className={tab === "editorial" ? "active" : ""} onClick={() => setTab("editorial")}>
                Editorial
              </button>
            </div>

            <div className="sheet-content">
              {tab === "karya" && (
                <dl className="sheet-list">
                  <div><dt>Bentuk</dt><dd>Cerpen</dd></div>
                  <div><dt>Genre</dt><dd>Keluarga</dd></div>
                  <div><dt>Bacaan</dt><dd>± 12 min</dd></div>
                  <div><dt>Status</dt><dd>Karya asli Jalin</dd></div>
                  <div><dt>ID</dt><dd>JLN-CER-0001</dd></div>
                  <div><dt>Versi</dt><dd>v0.1</dd></div>
                </dl>
              )}

              {tab === "watak" && (
                <div className="sheet-stack">
                  <div><b>Pak Long Rashid</b><span>Bapa</span></div>
                  <div><b>Along</b><span>Anak</span></div>
                </div>
              )}

              {tab === "editorial" && (
                <div className="sheet-stack">
                  <div><span>Penulis</span><b>Nara Zahin · Maya</b></div>
                  <div><span>Penulis & penyemak</span><b>Rafiq Naim · Maya</b></div>
                  <div><span>Editor</span><b>Izzat Anas</b></div>
                  <p className="sheet-note">Panel Bacaan AI belum dipaparkan sehingga format penilaiannya dimuktamadkan.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
