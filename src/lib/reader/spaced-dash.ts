/**
 * House style for the em dash (Izzat, 10 Oct 2026): a space on each side, "Dia diam — lama."
 *
 * Display only, like the curved quotation marks: the stored text is never changed (a change would also alter the text hash that the
 * AI ratings are bound to). A dash is spaced only where it joins two pieces of prose; these are left exactly as they are:
 *   - a dash that breaks off speech or a line ("Saya cuma—", "cuma—”"): nothing follows it but a closing mark or the end of the line;
 *   - a dash that opens a line ("— Kau datang?"): nothing precedes it;
 *   - runs of dashes, scene-break lines, image markers, code and link targets.
 */

/** Parts of a line that are not prose: image markers, inline code, link targets (same set smart-quotes leaves alone). */
const NOT_PROSE = /\[\[[^\]]*\]\]|`[^`]*`|\]\([^)]*\)/g;
const JOIN = /([\p{L}\p{N}.,;:!?…”’)\]"'])[ \t]*—[ \t]*(?=[\p{L}\p{N}“‘("'\[])/gu;

function spaceLine(line: string): string {
  if (!line.includes("—")) return line;
  const kept: string[] = [];
  const masked = line.replace(NOT_PROSE, (m) => {
    kept.push(m);
    return `\u0000${kept.length - 1}\u0000`;
  });
  return masked.replace(JOIN, "$1 — ").replace(/\u0000(\d+)\u0000/g, (_m, i) => kept[Number(i)]!);
}

export function spacedDashes(text: string): string {
  if (!text.includes("—")) return text;
  return text.split("\n").map(spaceLine).join("\n");
}
