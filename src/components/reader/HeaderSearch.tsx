"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { allResultsHref, type Suggestion } from "../../lib/reader/search-suggest";

/**
 * The search icon in the header row, at the end of the tabs. It grows into a small box to type in, in the same row; works that fit are suggested as the reader types,
 * and the page of full results (/cari) is a choice at the end of the list (or Enter). With no script the icon is still a link to that page.
 */
export default function HeaderSearch({ active }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [settled, setSettled] = useState(false); // suggestions are for the text now in the box
  const [selected, setSelected] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const refocus = useRef(false);

  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    const text = query.trim();
    setSettled(false);
    setSelected(-1);
    if (!open || text === "") {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/cari/cadangan?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setSettled(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSettled(true);
        }
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const close = (returnFocus: boolean) => {
    refocus.current = returnFocus;
    setOpen(false);
  };

  const onIconClick = (event: MouseEvent) => {
    // Opening the box is the click; a new tab or a modified click still goes to the page.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setOpen((value) => !value);
  };

  const rows = suggestions.length + (query.trim() === "" ? 0 : 1); // the last row is "see all results"
  const go = (href: string) => {
    window.location.href = href;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" && rows > 0) {
      event.preventDefault();
      setSelected((value) => (value + 1) % rows);
    } else if (event.key === "ArrowUp" && rows > 0) {
      event.preventDefault();
      setSelected((value) => (value <= 0 ? rows - 1 : value - 1));
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const picked = selected >= 0 && selected < suggestions.length ? suggestions[selected] : null;
    go(picked ? picked.href : allResultsHref(query));
  };

  const text = query.trim();
  const seeAllIndex = suggestions.length;

  return (
    <div className="header-search-wrap" ref={wrapRef}>
      {!open ? (
        <a
          ref={buttonRef}
          className={`header-search${active ? " active" : ""}${open ? " open" : ""}`}
          href="/cari"
          aria-label="Cari karya"
          aria-expanded={open}
          aria-controls="header-search-panel"
          onClick={onIconClick}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </a>
      ) : null}
      {open ? (
        <div className="header-search-panel" id="header-search-panel" role="search">
          <form className="header-search-field" onSubmit={onSubmit} action="/cari" method="get">
            <span className="header-search-glyph"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span>
            <input
              ref={inputRef}
              className="header-search-input"
              type="search"
              name="q"
              value={query}
              maxLength={100}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Cari tajuk atau penulis"
              aria-label="Cari karya"
              role="combobox"
              aria-expanded={rows > 0}
              aria-controls="header-search-list"
              aria-autocomplete="list"
              aria-activedescendant={selected >= 0 ? `header-search-opt-${selected}` : undefined}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </form>
          {text !== "" ? (
            <ul className="header-search-list" id="header-search-list" role="listbox" aria-label="Cadangan">
              {suggestions.map((item, index) => (
                <li key={item.href} role="option" id={`header-search-opt-${index}`} aria-selected={selected === index}>
                  <a className={selected === index ? "selected" : undefined} href={item.href}>
                    <span className="header-search-title">{item.title}</span>
                    <span className="header-search-meta">{item.typeLabel}{item.authors ? ` · ${item.authors}` : ""}</span>
                  </a>
                </li>
              ))}
              {settled && suggestions.length === 0 ? <li className="header-search-empty" role="presentation">Tiada karya yang sepadan lagi.</li> : null}
              <li role="option" id={`header-search-opt-${seeAllIndex}`} aria-selected={selected === seeAllIndex}>
                <a className={`header-search-all${selected === seeAllIndex ? " selected" : ""}`} href={allResultsHref(query)}>
                  Lihat semua hasil untuk “{text}”
                </a>
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
