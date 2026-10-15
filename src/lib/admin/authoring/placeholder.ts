/**
 * A value that is still a prompt's own placeholder, "(satu genre dalam satu atau dua patah perkataan)": the copied PROMPT reached a
 * field instead of an answer. Such text is never real content, so it is dropped when pasted and blocks publication if it is found.
 */
export function isPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^(?:_{3,}|={3,}|-{3,}|(?:\\\s*){2,})$/.test(v) || (v.length >= 8 && v.startsWith("(") && v.endsWith(")"));
}

/** Strip a repeated-item separator that a chatbot accidentally attached to a field value. */
export function withoutAssistantSeparators(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .split(/(?:_{3,}|={3,}|-{3,}|(?:\\\s*){2,})/, 1)[0]!
    .trim();
}

/** Names of public fields of a work that still hold a placeholder (Malay labels, for the editor). */
export function placeholderFields(work: { dek?: string | null; genre?: string | null; metadata?: Record<string, unknown> | null }, glossary: Array<{ term: string; meaning: string }>): string[] {
  const found: string[] = [];
  if (isPlaceholder(work.dek)) found.push("Dek");
  if (isPlaceholder(work.genre)) found.push("Genre");
  const meta = work.metadata ?? {};
  const list = (key: string): Array<Record<string, unknown>> => (Array.isArray(meta[key]) ? (meta[key] as Array<Record<string, unknown>>).filter((e) => e && typeof e === "object") : []);
  if (list("places").some((e) => isPlaceholder(e.name) || isPlaceholder(e.description))) found.push("Latar tempat");
  if (list("times").some((e) => isPlaceholder(e.name) || isPlaceholder(e.description))) found.push("Latar masa");
  if (list("characters").some((e) => isPlaceholder(e.name) || isPlaceholder(e.role))) found.push("Watak");
  if (glossary.some((g) => isPlaceholder(g.term) || isPlaceholder(g.meaning))) found.push("Glosari");
  return found;
}
