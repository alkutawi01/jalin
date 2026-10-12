"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A header link that opens a short list (the kinds of content). A button, so it works by keyboard and by touch: it opens on click,
 * Enter or Space, and on hover with a mouse; Escape or a click elsewhere closes it, and Tab out of it closes it too.
 */
export default function NavMenu({
  label,
  items,
  active,
  groupActive
}: {
  label: string;
  items: { label: string; href: string; match?: string }[];
  active?: string;
  groupActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** A mouse that leaves for a moment (the gap under the label, a slightly wandering path) must not close the menu at once. */
  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className="nav-menu"
      ref={rootRef}
      onMouseEnter={(event) => { cancelClose(); if (event.nativeEvent instanceof MouseEvent) setOpen(true); }}
      onMouseLeave={() => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 250); }}
      onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
    >
      <button
        type="button"
        className={`nav-menu-button${groupActive ? " active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <div className="nav-menu-panel">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={active && item.match === active ? "active" : undefined}
              aria-current={active && item.match === active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
