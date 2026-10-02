"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { renderItalics } from "../../lib/reader/inline-italics";

type Position = { left: number; top: number };

export default function GlossaryTerm({ term, termDisplay, meaning, children }: { term: string; termDisplay?: string; meaning: string; children: ReactNode }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const pointerType = useRef<string | null>(null);
  const wasOpenOnPointerDown = useRef(false);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

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
      if (!triggerRef.current?.contains(event.target as Node)) setOpen(false);
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
        aria-describedby={open ? tooltipId : undefined}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
          wasOpenOnPointerDown.current = open;
        }}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !event.currentTarget.matches(":focus-visible")) setOpen(false);
        }}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={() => { pointerType.current = null; }}
        onClick={() => {
          setOpen(pointerType.current === "touch" || pointerType.current === "pen" ? !wasOpenOnPointerDown.current : true);
        }}
      >
        {children}
      </button>
      {open ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          className="glossary-tooltip"
          role="tooltip"
          style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}
        >
          <strong>{renderItalics(termDisplay ?? term)}</strong>
          <span>{renderItalics(meaning)}</span>
        </span>,
        document.body
      ) : null}
    </>
  );
}
