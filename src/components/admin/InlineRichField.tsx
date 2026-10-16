"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { fieldValueFromNodes, inlineHtml, type InlineNode } from "../../lib/admin/inline-format";
import { dashInSelection, quotesInBlock } from "../../lib/admin/auto-dash";

/**
 * A short text the reader sees with italic or bold in it (a side note, a glossary meaning, a character's role, a place, the card note).
 * The editor types and sees the real thing: Ctrl+I (Cmd+I) makes the selection italic, Ctrl+B bold. There is no asterisk on screen and no
 * "Markdown" anywhere; what is stored is unchanged (*italic*, **bold**), so everything written before keeps working.
 * Only the manuscript ("Kandungan") has a Markdown view as well; every other field is this, and only this.
 */
export default function InlineRichField({
  value,
  onChange,
  multiline = false,
  id,
  ariaLabel,
  labelledBy,
  placeholder,
  maxLength,
  rows = 1,
  className = "",
  disabled = false,
  autoFocus = false,
  typography = false,
  onKeyDown
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  id?: string;
  ariaLabel?: string;
  labelledBy?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** For text that is read as prose: two hyphens become a dash and straight quotes the house style, as the manuscript does. */
  typography?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // What this box last told the page. The box is rewritten from `value` only when the page changes it from outside (a reset, a new row),
  // never while the editor types, so the cursor does not jump.
  const emitted = useRef<string | null>(null);
  const lastGoodHtml = useRef("");

  useEffect(() => {
    const el = ref.current;
    if (!el || value === emitted.current) return;
    el.innerHTML = inlineHtml(value ?? "");
    lastGoodHtml.current = el.innerHTML;
    emitted.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function read(): string {
    return fieldValueFromNodes(ref.current!.childNodes as unknown as ArrayLike<InlineNode>, multiline);
  }

  function handleInput() {
    const el = ref.current;
    if (!el) return;
    if (typography) {
      dashInSelection();
      quotesInBlock(el);
    }
    const next = read();
    if (maxLength !== undefined && next.length > maxLength) {
      // Over the limit: put back what was there (the browser cannot be told to refuse a character it has already taken).
      el.innerHTML = lastGoodHtml.current;
      placeCaretAtEnd(el);
      return;
    }
    // An emptied box keeps a stray <br>; without this its placeholder never comes back.
    if (next === "" && el.innerHTML !== "") el.innerHTML = "";
    lastGoodHtml.current = el.innerHTML;
    emitted.current = next;
    onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === "i") {
      event.preventDefault();
      document.execCommand("italic");
      handleInput();
    } else if (mod && key === "b") {
      event.preventDefault();
      document.execCommand("bold");
      handleInput();
    } else if (event.key === "Enter") {
      // One line break, the same in every browser (they disagree about <div> and <p>), and none at all in a one-line field.
      event.preventDefault();
      if (multiline && !mod) {
        document.execCommand("insertLineBreak");
        handleInput();
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    // Pasted text is plain text: whatever the page it came from looked like does not follow it in.
    event.preventDefault();
    let text = event.clipboardData.getData("text/plain");
    if (!multiline) text = text.replace(/\s*\n\s*/g, " ");
    document.execCommand("insertText", false, text);
  }

  return (
    <div
      ref={ref}
      id={id}
      className={`admin-textarea admin-rich-field${multiline ? " is-multiline" : ""} ${className}`.trim()}
      role="textbox"
      aria-multiline={multiline}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      aria-description="Ctrl+I untuk condong, Ctrl+B untuk tebal"
      data-placeholder={placeholder}
      contentEditable={!disabled}
      suppressContentEditableWarning
      tabIndex={disabled ? -1 : 0}
      style={{ minHeight: `${Math.max(rows, 1) * 1.6 + 1.2}em` }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onDrop={(event) => event.preventDefault()}
    />
  );
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
