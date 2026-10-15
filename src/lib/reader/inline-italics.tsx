import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cleanLiteralEmphasis } from "./literal-emphasis";
import { isDictionaryWord } from "./dictionary-words";

/**
 * Italics the editor marks by hand with *asterisks* in a glossary term or meaning.
 * Nothing is italicised automatically; text without asterisks stays upright.
 */

const MARK = /\*([^*\n]+)\*/g;

/** The text without italic marks, for matching, comparing and screen readers. */
export function stripItalicMarks(text: string): string {
  return (text ?? "").replace(MARK, "$1").replace(/\*/g, "");
}

/** Render *marked* parts in <em>; everything else as plain text. */
export function renderItalics(text: string): ReactNode {
  const cleanChildren = (children: ReactNode): ReactNode => React.Children.map(children, child =>
    typeof child === "string" && !/\\\*/.test(text) ? cleanLiteralEmphasis(child) : child);
  return <ReactMarkdown allowedElements={["p", "em", "strong", "code", "br"]} unwrapDisallowed components={{
    p: ({ children }) => <>{cleanChildren(children)}</>,
    strong: ({ children }) => <strong>{cleanChildren(children)}</strong>,
    em: ({ children }) => typeof children === "string" && isDictionaryWord(children)
      ? <>{children}</> : <em>{cleanChildren(children)}</em>,
  }}>{text ?? ""}</ReactMarkdown>;
}

/**
 * Ctrl+I behaviour for a text field: wrap the selection in *...*, or remove the marks when the
 * selection is already wrapped. With nothing selected it inserts a pair and leaves the caret between them.
 */
export function toggleItalicSelection(
  value: string,
  start: number,
  end: number
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  if (selected.length >= 2 && selected.startsWith("*") && selected.endsWith("*")) {
    const inner = selected.slice(1, -1);
    return { value: before + inner + after, selectionStart: start, selectionEnd: start + inner.length };
  }
  if (before.endsWith("*") && after.startsWith("*") && selected.length > 0) {
    return { value: before.slice(0, -1) + selected + after.slice(1), selectionStart: start - 1, selectionEnd: end - 1 };
  }
  return { value: `${before}*${selected}*${after}`, selectionStart: start + 1, selectionEnd: end + 1 };
}
