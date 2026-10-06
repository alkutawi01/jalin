"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { placeMarginNotes, trackOffsets } from "../../lib/reader/margin-notes";

type Note = { number: number; text: string };

const NARROW = "(max-width: 820px)";
const NOTE_GAP = 14;
const CARD_GAP = 28;
const MAX_SHIFT = 220;

/** A link inside a margin note is reachable by touch or mouse, but not by Tab: the list at the end of the chapter is the keyboard route. */
const noteComponents = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => <a href={href} tabIndex={-1}>{children}</a>
};

/**
 * Notes beside the text.
 *
 * Wide screen: each note is set in the right margin level with its number, below the Watak & Latar card; one that does not fit
 * there goes to the left margin if that has room (see lib/reader/margin-notes). The list at the end of the chapter stays in the
 * page, and is hidden from view only for the notes that are in a margin (it is still there for screen readers and printing).
 * Narrow screen (phone): there is no margin; tapping a number opens its note in a small box, like a glossary term, and the list at
 * the end of the chapter stays visible.
 *
 * Without JavaScript nothing here is shown and the numbers link to the list, as before.
 */
export default function FootnoteMargin({ notes }: { notes: Note[] }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef<Set<number>>(new Set());
  const [popover, setPopover] = useState<{ number: number; left: number; top: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Wide screen: measure and place.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const grid = layer?.parentElement;
    if (!layer || !grid) return;
    const list = document.querySelector<HTMLElement>("[data-footnotes]");
    let frame = 0;

    function setListMode(mode: "all" | "some" | "none", placed: Set<number>) {
      if (!list) return;
      if (mode === "none") list.removeAttribute("data-margin");
      else list.setAttribute("data-margin", mode);
      list.querySelectorAll<HTMLElement>("li[id^='nota-']").forEach((li) => {
        const n = Number(li.id.replace("nota-", ""));
        if (placed.has(n)) li.setAttribute("data-in-margin", "true");
        else li.removeAttribute("data-in-margin");
      });
    }

    function layout() {
      const layerEl = layerRef.current;
      if (!layerEl || !grid) return;
      const nodes = Array.from(layerEl.querySelectorAll<HTMLElement>("[data-margin-note]"));
      if (window.matchMedia(NARROW).matches) {
        nodes.forEach((node) => { node.style.visibility = "hidden"; });
        placedRef.current = new Set();
        setListMode("none", new Set()); // on a phone the list at the end of the chapter stays, beside the tap box
        return;
      }
      const cs = getComputedStyle(grid);
      const tracks = cs.gridTemplateColumns.split(" ").map(parseFloat).filter((n) => Number.isFinite(n));
      if (tracks.length < 2) {
        nodes.forEach((node) => { node.style.visibility = "hidden"; });
        placedRef.current = new Set();
        setListMode("none", new Set());
        return;
      }
      const paddingLeft = parseFloat(cs.paddingLeft) || 0;
      const paddingRight = parseFloat(cs.paddingRight) || 0;
      const gap = parseFloat(cs.columnGap) || 0;
      const xs = trackOffsets(tracks, gap, grid.clientWidth - paddingLeft - paddingRight, cs.justifyContent, paddingLeft);
      const rightIndex = tracks.length - 1;
      const hasLeft = tracks.length >= 3;
      const gridTop = grid.getBoundingClientRect().top;

      const below = (selector: string) => {
        const card = grid.querySelector<HTMLElement>(selector);
        return card ? card.getBoundingClientRect().bottom - gridTop + CARD_GAP : 0;
      };
      const rightFloor = below(".right-rail .rail-card");
      const leftFloor = hasLeft ? below(".left-rail .rail-card") : null;

      // Every note is measured at the width of the right margin (the left one is the same width where it exists).
      const inputs = nodes.map((node) => {
        const number = Number(node.dataset.marginNote);
        const ref = document.getElementById(`rujuk-${number}`);
        node.style.width = `${tracks[rightIndex]}px`;
        return { node, number, height: node.offsetHeight, refTop: ref ? ref.getBoundingClientRect().top - gridTop : Number.NaN };
      });
      const placements = placeMarginNotes(
        inputs.map(({ number, refTop, height }) => ({ number, refTop, height })),
        { rightFloor, leftFloor, gap: NOTE_GAP, maxShift: MAX_SHIFT }
      );
      const placed = new Set<number>();
      placements.forEach((placement, index) => {
        const node = inputs[index]!.node;
        if (placement.side === "list") {
          node.style.visibility = "hidden";
          return;
        }
        placed.add(placement.number);
        const column = placement.side === "left" ? 0 : rightIndex;
        node.style.width = `${tracks[column]}px`;
        node.style.left = `${xs[column]}px`;
        node.style.top = `${placement.top}px`;
        node.style.visibility = "visible";
        node.dataset.side = placement.side;
      });
      placedRef.current = placed;
      setListMode(placed.size === 0 ? "none" : placed.size === nodes.length ? "all" : "some", placed);
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    }

    layout();
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    void document.fonts?.ready.then(schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    const article = grid.querySelector(".story-body");
    if (observer) {
      if (article) observer.observe(article);
      observer.observe(grid);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      observer?.disconnect();
      setListMode("none", new Set());
    };
  }, [notes]);

  // A tap (or click) on a number: a box beside it on a phone; on a wide screen the note in the margin is lit.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[role='doc-noteref']") as HTMLAnchorElement | null;
      if (!anchor || !anchor.closest(".story-body")) return;
      const number = Number((anchor.getAttribute("href") ?? "").replace("#nota-", ""));
      if (!Number.isFinite(number) || !notes.some((note) => note.number === number)) return;
      if (window.matchMedia(NARROW).matches) {
        event.preventDefault();
        triggerRef.current = anchor;
        const rect = anchor.getBoundingClientRect();
        setPopover((current) => (current?.number === number ? null : { number, left: rect.left, top: rect.bottom }));
        return;
      }
      if (placedRef.current.has(number)) {
        event.preventDefault();
        const node = layerRef.current?.querySelector<HTMLElement>(`[data-margin-note="${number}"]`);
        if (node) {
          node.classList.add("footnote-margin-note--lit");
          window.setTimeout(() => node.classList.remove("footnote-margin-note--lit"), 1800);
        }
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [notes]);

  // The box: placed beside its number, kept on screen, closed by Escape, a tap elsewhere, or leaving the narrow layout.
  useLayoutEffect(() => {
    if (!popover) return;
    function place() {
      const box = popoverRef.current;
      const anchor = triggerRef.current;
      if (!box || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const margin = 12;
      const viewportWidth = document.documentElement.clientWidth;
      const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - boxRect.width / 2, viewportWidth - boxRect.width - margin));
      const roomBelow = window.innerHeight - rect.bottom - margin;
      const above = roomBelow < boxRect.height + 10 && rect.top - margin > roomBelow;
      const top = above ? rect.top - boxRect.height - 10 : rect.bottom + 10;
      box.style.left = `${left}px`;
      box.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - boxRect.height - margin))}px`;
      box.style.visibility = "visible";
    }
    place();
    const close = () => setPopover(null);
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }
    const media = window.matchMedia(NARROW);
    const onMedia = () => { if (!media.matches) close(); };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onMedia);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMedia);
    };
  }, [popover]);

  const open = popover ? notes.find((note) => note.number === popover.number) : undefined;

  return (
    <>
      <div ref={layerRef} className="footnote-margins" aria-hidden="true">
        {notes.map((note) => (
          <div key={note.number} className="footnote-margin-note" data-margin-note={note.number}>
            <span className="footnote-margin-number">{note.number}</span>
            <ReactMarkdown components={noteComponents}>{note.text}</ReactMarkdown>
          </div>
        ))}
      </div>
      {open
        ? createPortal(
            <div ref={popoverRef} className="glossary-tooltip footnote-popover" role="dialog" aria-label={`Nota ${open.number}`} style={{ visibility: "hidden" }}>
              <span className="footnote-popover-number" aria-hidden="true">{open.number}</span>
              <ReactMarkdown>{open.text}</ReactMarkdown>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
