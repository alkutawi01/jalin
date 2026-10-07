"use client";

import { useEffect, useRef } from "react";

export interface ChapterPickerRow {
  slug: string;
  title: string;
  minutes: number;
  href: string;
}

/** The list of chapters as a dropdown. Closes on Escape (focus returns to the button) and on a click or tab outside it. */
export default function ChapterPicker({ rows, currentSlug }: { rows: ChapterPickerRow[]; currentSlug?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const close = () => { details.open = false; };
    const onPointer = (event: Event) => { if (details.open && !details.contains(event.target as Node)) close(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) {
        close();
        details.querySelector("summary")?.focus();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (details.open && event.relatedTarget && !details.contains(event.relatedTarget as Node)) close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    details.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      details.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <details className="chapter-picker" ref={ref}>
      <summary>Senarai bab ({rows.length})</summary>
      <ol>
        {rows.map((row, index) => (
          <li key={row.slug}>
            <a href={row.href} aria-current={row.slug === currentSlug ? "page" : undefined}>
              <span className="chapter-num">{index + 1}</span>
              <span className="chapter-ttl">{row.title}</span>
              <span className="chapter-min">± {row.minutes} minit</span>
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
