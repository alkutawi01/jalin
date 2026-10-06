"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { renderItalics, stripItalicMarks } from "../../lib/reader/inline-italics";

type Position = { left: number; top: number };

type GlossaryTermProps = { term: string; termDisplay?: string; meaning: string; pronunciation?: string; original?: string; originalLanguage?: string; children: ReactNode };

export default function GlossaryTerm({ term, termDisplay, meaning, pronunciation, original, originalLanguage, children }: GlossaryTermProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const pointerType = useRef<string | null>(null);
  const wasOpenOnPointerDown = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  /**
   * The tooltip stays while the pointer travels from the word to it (and while it is over it), so the meaning can be
   * read steadily and its text selected. It closes a moment after the pointer leaves both.
   */
  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  }
  useEffect(() => cancelClose, []);

  useLayoutEffect(() => {
    if (!open) return;

    function placeTooltip() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const gap = 10;
      const margin = 12;
      const left = Math.max(margin, Math.min(
        rect.left + rect.width / 2 - tooltipRect.width / 2,
        viewportWidth - tooltipRect.width - margin
      ));
      const roomAbove = rect.top - margin;
      const roomBelow = viewportHeight - rect.bottom - margin;
      const above = roomAbove >= tooltipRect.height + gap || roomAbove > roomBelow;
      const preferredTop = above ? rect.top - tooltipRect.height - gap : rect.bottom + gap;
      const top = Math.max(margin, Math.min(preferredTop, viewportHeight - tooltipRect.height - margin));

      setPosition({ left, top });
    }

    placeTooltip();
    window.addEventListener("resize", placeTooltip);
    window.addEventListener("scroll", placeTooltip, true);
    return () => {
      window.removeEventListener("resize", placeTooltip);
      window.removeEventListener("scroll", placeTooltip, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function dismissOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) setOpen(false);
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="glossary-term"
        aria-expanded={open}
        aria-describedby={descriptionId}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
          wasOpenOnPointerDown.current = open;
        }}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") { cancelClose(); setOpen(true); } }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !event.currentTarget.matches(":focus-visible")) scheduleClose();
        }}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
        onBlur={() => { cancelClose(); setOpen(false); }}
        onKeyDown={() => { pointerType.current = null; }}
        onClick={() => {
          setOpen(pointerType.current === "touch" || pointerType.current === "pen" ? !wasOpenOnPointerDown.current : true);
        }}
      >
        {children}
      </button>
      {/* Always present for screen readers; the floating tooltip is the visual version. */}
      <span id={descriptionId} className="sr-only">{[pronunciation ? `Sebutan: ${pronunciation}.` : "", original ? `${originalLanguage ? `${originalLanguage}: ` : "Ejaan asal: "}${original}.` : "", meaning].filter(Boolean).map(stripItalicMarks).join(" ")}</span>
      {open ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          className="glossary-tooltip"
          role="tooltip"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") cancelClose(); }}
          onPointerLeave={(event) => { if (event.pointerType === "mouse" && !triggerRef.current?.matches(":focus-visible")) scheduleClose(); }}
          style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}
        >
          <strong>{renderItalics(termDisplay ?? term)}</strong>
          {pronunciation || original ? (
            <span className="glossary-origin">
              {pronunciation ? <span className="glossary-pronunciation">Sebutan: {renderItalics(pronunciation)}</span> : null}
              {original ? <span className="glossary-original" lang={originalLanguage?.toLowerCase().startsWith("arab") ? "ar" : undefined} dir="auto">{originalLanguage ? `${originalLanguage}: ` : ""}{original}</span> : null}
            </span>
          ) : null}
          <span>{renderItalics(meaning)}</span>
        </span>,
        document.body
      ) : null}
    </>
  );
}
