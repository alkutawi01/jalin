/**
 * Short descriptions (a character's role, a place's note, a glossary meaning) start with a capital letter, whatever the editor typed,
 * so the lists look the same everywhere. Only the first LETTER is changed: opening quotes, brackets and the editor's *italic* marks in front
 * of it are skipped, a text that starts with a digit is left alone, and nothing else in the text is touched.
 */
const SKIPPED = /^[\s"'“‘«(\[*_]*/u;

export function capitaliseFirst(text: string | null | undefined): string {
  const value = String(text ?? "");
  const lead = SKIPPED.exec(value)?.[0] ?? "";
  const first = value.slice(lead.length, lead.length + 1);
  if (!first || first.toLocaleUpperCase("ms") === first || first.toLocaleLowerCase("ms") !== first) return value;
  return lead + first.toLocaleUpperCase("ms") + value.slice(lead.length + 1);
}

/**
 * A short description (a role, a place or time note): capital first letter, and no full stop at the end of a one-line label
 * ("Ibu Aminah." becomes "Ibu Aminah"). A text with several sentences keeps its stops.
 */
export function tidyShort(text: string | null | undefined): string {
  const value = capitaliseFirst(String(text ?? "").trim());
  return /[.!?…]/.test(value.slice(0, -1)) ? value : value.replace(/\.$/, "").trimEnd();
}
