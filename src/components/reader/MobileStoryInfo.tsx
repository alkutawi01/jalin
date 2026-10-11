"use client";

import { useEffect, useRef, useState } from "react";
import { renderItalics } from "../../lib/reader/inline-italics";
import { capitaliseFirst } from "../../lib/capitalise-first";
import type { StoryInfoData } from "./types";
import AiRating from "./AiRating";

type Tab = "karya" | "watak" | "latar" | "editorial" | "bab";

export default function MobileStoryInfo({ data }: { data: StoryInfoData }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false); // the sheet slides down before it is removed
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tab, setTab] = useState<Tab>("karya");
  const hasSetting = (data.places?.length ?? 0) > 0 || (data.times?.length ?? 0) > 0;
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const edgeStart = useRef<{ x: number; y: number } | null>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  /** Slides the sheet down (matches .mobile-info-sheet.closing in globals.css), then removes it. */
  function close() {
    if (!open || closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setOpen(false); return; }
    setClosing(true);
    closeTimer.current = setTimeout(() => { setOpen(false); setClosing(false); }, 200);
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // The sheet behaves as a dialog: focus moves in, the page behind does not scroll, and focus returns to Info on close.
  useEffect(() => {
    if (open) {
      // The lock goes on <html>, not <body>: on a narrow screen body is clipped (overflow-x), and giving it overflow:hidden made it a
      // scroll container, which un-stuck the sticky header so the tabs scrolled out of sight while the sheet was open.
      const root = document.documentElement;
      const previousOverflow = root.style.overflow;
      root.style.overflow = "hidden";
      document.getElementById(`sheet-tab-${tab}`)?.focus();
      wasOpen.current = true;
      return () => {
        root.style.overflow = previousOverflow;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      handleRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The Penilaian dialog inside the sheet is a native modal <dialog>: it keeps Tab and closes on Escape by itself, and that Escape must
      // close only the dialog, not the sheet under it.
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab" || !open) return;
      // The sheet is modal: Tab and Shift+Tab stay inside it instead of walking on into the page behind the backdrop.
      const active = document.activeElement as HTMLElement | null;
      const sheet = document.getElementById("mobile-story-info");
      if (!sheet) return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest("dialog:not([open])"));
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (!active || !sheet.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }
    function onTouchStart(event: TouchEvent) {
      // From 761px the side column carries the same details, so the swipe from the edge is for a phone only.
      if (open || event.touches.length !== 1 || window.innerWidth > 760) return;
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
    if (dragY > 110) close();
    setDragY(0);
    startY.current = null;
  }

  return <>
    <button ref={handleRef} type="button" className="mobile-info-handle" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-story-info">Tentang karya<svg className="mobile-info-chevron" viewBox="0 0 8 12" width="8" height="12" aria-hidden="true" focusable="false"><path d="M1.5 1.5 6 6l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    {open && <div className={"mobile-info-layer" + (closing ? " closing" : "")}>
      <button type="button" className="mobile-info-backdrop" aria-label="Tutup maklumat karya" onClick={close} />
      <section id="mobile-story-info" role="dialog" aria-modal="true" className={"mobile-info-sheet" + (closing ? " closing" : "")} style={{ transform: "translateY(" + dragY + "px)" }} aria-label="Maklumat karya">
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
            Penyuntingan
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
              {data.characters.map((character) => <div key={character.name}><b>{renderItalics(character.name)}</b><span>{renderItalics(capitaliseFirst(character.role))}</span></div>)}
            </div>
          )}
          {tab === "latar" && (
            <div id="sheet-panel-latar" role="tabpanel" aria-labelledby="sheet-tab-latar" className="sheet-stack">
              {[...(data.places ?? []).map((place) => <div key={"p-" + place.name}><b>{renderItalics(place.name)}</b>{place.description ? <span>{renderItalics(place.description)}</span> : null}</div>), ...((data.times ?? []).length > 0 ? [<div key="t-head" className="sheet-subhead"><b>Latar masa</b></div>] : []), ...(data.times ?? []).map((time) => <div key={"t-" + time.name}><b>{renderItalics(time.name)}</b>{time.description ? <span>{renderItalics(time.description)}</span> : null}</div>)]}
            </div>
          )}
          {tab === "editorial" && (
            <div id="sheet-panel-editorial" role="tabpanel" aria-labelledby="sheet-tab-editorial" className="sheet-stack">
              {data.editorial.map((credit) => <div key={credit.role + "-" + credit.names.join("|")}><span>{credit.role}</span>{credit.names.map((name) => <b key={name}>{name}</b>)}</div>)}
              {data.note ? <p className="sheet-note">{renderItalics(data.note)}</p> : null}
              {data.aiRating ? <div className="sheet-ai"><b>Penilaian</b><AiRating workId={data.aiRating.workId} summary={data.aiRating.summary} /></div> : null}
            </div>
          )}
          {tab === "bab" && data.bab && (
            <div
              id="sheet-panel-bab"
              role="tabpanel"
              aria-labelledby="sheet-tab-bab"
              className="sheet-stack"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) close();
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
