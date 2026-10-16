/**
 * The line a chatbot draws between items ("____") is layout, never part of a name, a role, a place or a country.
 * It arrives in several shapes: plain "____", spaced "_ _ _ _", and the Markdown-escaped "\_\_\_\_" that chat windows copy out.
 * The older cleaners only knew three plain underscores in a row, so the escaped form leaked into stored data and onto the public pages.
 */

/** Three or more underscores (each optionally escaped, optionally spaced), or three or more equals signs or hyphens. */
export const SEPARATOR_RUN = /(?:\\?_[ \t ]*){3,}|(?:\\?=){3,}|(?:\\?-){3,}/;
const SEPARATOR_RUN_GLOBAL = new RegExp(SEPARATOR_RUN.source, "g");
const SEPARATOR_TAIL = new RegExp(`(?:[ \\t\\u00a0]*(?:${SEPARATOR_RUN.source}))+[ \\t\\u00a0]*$`);

/** A short text without the separator the chatbot left on it: everything from the separator onwards is dropped. */
export function stripSeparatorMarks(text: string | null | undefined): string {
  const value = String(text ?? "");
  const at = value.search(SEPARATOR_RUN);
  return (at >= 0 ? value.slice(0, at) : value).replace(/\s+/g, " ").trim();
}

/** Only the tail of a text is cleaned (a long text may legitimately contain a row of hyphens in its middle). */
export function stripSeparatorTail(text: string | null | undefined): string {
  return String(text ?? "").replace(SEPARATOR_TAIL, "").trim();
}

/** In a whole chatbot answer: a run of three or more escaped underscores is a separator line written as Markdown. */
export function unescapeSeparatorRuns(answer: string): string {
  return answer.replace(/(?:\\_){3,}/g, "____");
}

export { SEPARATOR_RUN_GLOBAL };
