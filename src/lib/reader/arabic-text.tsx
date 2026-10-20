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

/**
 * The end-of-verse mark as a printed Mushaf sets it (Izzat, 20 Oct 2026): U+06DD followed at once by the number in Arabic-Indic digits
 * (۝١), which Amiri draws as an ornate circle around the number. Authors may also write the older forms, ﴿١﴾  ﴿1﴾  (١)  (1)  {1}  ۝1,
 * straight after Arabic text; they are turned into the circle mark when shown, and the stored text is never changed.
 */
const MARK_DIGITS = "0-9\u0660-\u0669\u06F0-\u06F9";
const AYAT_MARK = new RegExp(`\\u06DD\\s*([${MARK_DIGITS}]+)|[\\uFD3E\\uFD3F]\\s*([${MARK_DIGITS}]+)\\s*[\\uFD3E\\uFD3F]|\\(\\s*([${MARK_DIGITS}]+)\\s*\\)|\\{\\s*([${MARK_DIGITS}]+)\\s*\\}`, "gu");

/** Digits (Latin, Arabic-Indic or Persian) as Arabic-Indic digits. */
export function toArabicIndic(digits: string): string {
  return digits.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d))).replace(/[۰-۹]/g, (d) => String.fromCharCode(0x0660 + d.charCodeAt(0) - 0x06f0));
}

/** The verse marks in the text (any accepted form) written as ۝ + Arabic-Indic number. Brackets and braces count only straight after Arabic text. */
export function normalizeAyatMarks(text: string): string {
  return text.replace(AYAT_MARK, (match, d1?: string, d2?: string, d3?: string, d4?: string, offset?: number, whole?: string) => {
    const at = offset ?? 0;
    const source = whole ?? text;
    if (!match.startsWith("۝")) {
      const last = source.slice(0, at).trimEnd().slice(-1);
      if (!last || !(ARABIC_TEST.test(last) || /[)﴾﴿}]/.test(last))) return match;
    }
    const lead = at > 0 && !/\s/.test(source[at - 1] ?? "") ? " " : "";
    return `${lead}۝${toArabicIndic(d1 ?? d2 ?? d3 ?? d4 ?? "")}`;
  });
}

/** Verse marks in a string, as <bdi class="ayat-number">۝١</bdi> inside the rest of the text. */
export function ayatMarkNodes(text: string): ReactNode[] {
  return normalizeAyatMarks(text).split(/(۝[٠-٩]+)/u).map((piece, i) => i % 2 === 1 ? <bdi key={`am-${i}`} className="ayat-number">{piece}</bdi> : piece).filter((piece) => piece !== "");
}

/** The same through the children of a paragraph that is only Arabic (emphasis and the like included). */
export function ayatMarkChildren(children: ReactNode): ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") return <>{ayatMarkNodes(child)}</>;
    if (React.isValidElement<{ children?: ReactNode; className?: string }>(child) && child.type !== "code" && child.type !== "bdi") {
      return React.cloneElement(child, { children: ayatMarkChildren(child.props.children) });
    }
    return child;
  });
}
