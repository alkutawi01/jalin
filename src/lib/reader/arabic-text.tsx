import React, { type ReactNode } from "react";

/**
 * Arabic in the reader (Izzat, 20 Oct 2026: verses of the Quran and Arabic quotations, in the Amiri typeface).
 * Arabic script is set apart as a run with its own language and direction, so that it is read as Arabic by a screen reader,
 * drawn right to left in a Naskh face, and cannot reorder the Malay words, brackets or numbers beside it.
 */
const ARABIC = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
/** One Arabic run: starts and ends on an Arabic letter, and may hold spaces, Arabic punctuation, digits and hyphens between. */
const RUN = new RegExp(`[${ARABIC}](?:[${ARABIC}\\s\\u200c\\u200d\\u060c\\u061b\\u061f0-9\\-\\u2013]*[${ARABIC}])?`, "gu");
const ARABIC_TEST = new RegExp(`[${ARABIC}]`, "u");
/** What may stand in a paragraph that is only a verse or quotation: Arabic, the ornate brackets, punctuation and numbers. */
const ONLY_ARABIC = new RegExp(`^[\\s${ARABIC}\\u200c\\u200d\\uFD3E\\uFD3F()\\[\\]{}"“”'‘’«»،؛؟.,:;!?0-9\\-\\u2013\\u2014*_~]+$`, "u");

export function hasArabic(text: string): boolean {
  return ARABIC_TEST.test(text);
}

/** True when the text is Arabic and nothing else (a verse set on its own line), apart from brackets, punctuation and numbers. */
export function isArabicOnly(text: string): boolean {
  const t = text.trim();
  return t !== "" && ARABIC_TEST.test(t) && ONLY_ARABIC.test(t);
}

/** Splits a string into plain text and Arabic runs; each run becomes <span class="arabic" lang="ar" dir="rtl">. */
export function wrapArabic(text: string): ReactNode[] {
  if (!hasArabic(text)) return [text];
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(RUN)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push(text.slice(cursor, start));
    out.push(<span key={`ar-${start}`} className="arabic" lang="ar" dir="rtl">{match[0]}</span>);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** The same through a whole tree of children (emphasis, links and the like), leaving code and elements already set as Arabic alone. */
export function arabicChildren(children: ReactNode): ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = wrapArabic(child);
      return parts.length === 1 ? parts[0] : <>{parts}</>;
    }
    if (React.isValidElement<{ children?: ReactNode; className?: string }>(child) && child.type !== "code" && !(typeof child.props.className === "string" && child.props.className.includes("arabic"))) {
      return React.cloneElement(child, { children: arabicChildren(child.props.children) });
    }
    return child;
  });
}
