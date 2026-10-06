"use client";

import { useEffect, useRef, useState } from "react";
import { capitaliseFirst } from "../../lib/capitalise-first";
import type { StoryInfoData } from "./types";

type Tab = "karya" | "watak" | "latar" | "editorial" | "bab";

export default function MobileStoryInfo({ data }: { data: StoryInfoData }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("karya");
  const hasSetting = (data.places?.length ?? 0) > 0 || (data.times?.length ?? 0) > 0;
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const edgeStart = useRef<{ x: number; y: number } | null>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // The sheet behaves as a dialog: focus moves in, the page behind does not scroll, and focus returns to Info on close.
  useEffect(() => {
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.getElementById(`sheet-tab-${tab}`)?.focus();
      wasOpen.current = true;
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      handleRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    function onTouchStart(event: TouchEvent) {
      if (open || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX >= window.innerWidth - 24) edgeStart.current = { x: touch.clientX, y: touch.clientY };
    }
    function onTouchEnd(event: TouchEvent) {
      if (open || !edgeStart.current || event.changedTouches.length !== 1) { edgeStart.current = null; return; }
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

  return <>
    <button ref={handleRef} type="button" className="mobile-info-handle" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-story-info">Tentang karya<span aria-hidden="true"> ›</span></button>
    {open && <div className="mobile-info-layer">
      <button type="button" className="mobile-info-backdrop" aria-label="Tutup maklumat karya" onClick={() => setOpen(false)} />
      <section id="mobile-story-info" role="dialog" aria-modal="true" className="mobile-info-sheet" style={{ transform: "translateY(" + dragY + "px)" }} aria-label="Maklumat karya">
        <div className="sheet-drag-zone" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className="sheet-grabber" />
        </div>
        <div
          className="sheet-tabs"
          role="tablist"
          aria-label="Maklumat cerita"
          onKeyDown={(event) => {
            const tabs: Tab[] = ["karya", "watak", ...(hasSetting ? (["latar"] as Tab[]) : []), "editorial", ...(data.bab && data.bab.length > 0 ? (["bab"] as Tab[]) : [])];
            const index = tabs.indexOf(tab);
            if (event.key === "ArrowRight") {
              event.preventDefault();
              const next = tabs[(index + 1) % tabs.length]!;
              setTab(next);
              document.getElementById(`sheet-tab-${next}`)?.focus();
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              const prev = tabs[(index - 1 + tabs.length) % tabs.length]!;
              setTab(prev);
              document.getElementById(`sheet-tab-${prev}`)?.focus();
            }
          }}
        >
          <button
            type="button"
            id="sheet-tab-karya"
            role="tab"
            aria-selected={tab === "karya"}
            aria-controls="sheet-panel-karya"
            tabIndex={tab === "karya" ? 0 : -1}
            className={tab === "karya" ? "active" : ""}
            onClick={() => setTab("karya")}
          >
            Karya
          </button>
          <button
            type="button"
            id="sheet-tab-watak"
            role="tab"
            aria-selected={tab === "watak"}
            aria-controls="sheet-panel-watak"
            tabIndex={tab === "watak" ? 0 : -1}
            className={tab === "watak" ? "active" : ""}
            onClick={() => setTab("watak")}
          >
            Watak
          </button>
          {hasSetting ? (
            <button
              type="button"
              id="sheet-tab-latar"
              role="tab"
              aria-selected={tab === "latar"}
              aria-controls="sheet-panel-latar"
              tabIndex={tab === "latar" ? 0 : -1}
              className={tab === "latar" ? "active" : ""}
              onClick={() => setTab("latar")}
            >
              Latar
            </button>
          ) : null}
          <button
            type="button"
            id="sheet-tab-editorial"
            role="tab"
            aria-selected={tab === "editorial"}
            aria-controls="sheet-panel-editorial"
            tabIndex={tab === "editorial" ? 0 : -1}
            className={tab === "editorial" ? "active" : ""}
            onClick={() => setTab("editorial")}
          >
            Editorial
          </button>
          {data.bab && data.bab.length > 0 ? (
            <button
              type="button"
              id="sheet-tab-bab"
              role="tab"
              aria-selected={tab === "bab"}
              aria-controls="sheet-panel-bab"
              tabIndex={tab === "bab" ? 0 : -1}
              className={tab === "bab" ? "active" : ""}
              onClick={() => setTab("bab")}
            >
              Bab
            </button>
          ) : null}
        </div>
        <div className="sheet-content">
          {tab === "karya" && (
            <dl id="sheet-panel-karya" role="tabpanel" aria-labelledby="sheet-tab-karya" className="sheet-list">
              {data.work.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
            </dl>
          )}
          {tab === "watak" && (
            <div id="sheet-panel-watak" role="tabpanel" aria-labelledby="sheet-tab-watak" className="sheet-stack">
              {data.characters.map((character) => <div key={character.name}><b>{character.name}</b><span>{capitaliseFirst(character.role)}</span></div>)}
            </div>
          )}
          {tab === "latar" && (
            <div id="sheet-panel-latar" role="tabpanel" aria-labelledby="sheet-tab-latar" className="sheet-stack">
              {[...(data.places ?? []).map((place) => <div key={"p-" + place.name}><b>{place.name}</b>{place.description ? <span>{place.description}</span> : null}</div>), ...((data.times ?? []).length > 0 ? [<div key="t-head" className="sheet-subhead"><b>Latar masa</b></div>] : []), ...(data.times ?? []).map((time) => <div key={"t-" + time.name}><b>{time.name}</b>{time.description ? <span>{time.description}</span> : null}</div>)]}
            </div>
          )}
          {tab === "editorial" && (
            <div id="sheet-panel-editorial" role="tabpanel" aria-labelledby="sheet-tab-editorial" className="sheet-stack">
              {data.editorial.map((credit) => <div key={credit.role + "-" + credit.names.join("|")}><span>{credit.role}</span>{credit.names.map((name) => <b key={name}>{name}</b>)}</div>)}
              {data.note ? <p className="sheet-note">{data.note}</p> : null}
            </div>
          )}
          {tab === "bab" && data.bab && (
            <div
              id="sheet-panel-bab"
              role="tabpanel"
              aria-labelledby="sheet-tab-bab"
              className="sheet-stack"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              {data.bab.map((item) => (
                <div key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>}
  </>;
}
