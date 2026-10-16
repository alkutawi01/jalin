import { withNoteChips, type NoteContext } from "./visual-notes";

/**
 * Italic and bold inside a line of text, written with * and ** in storage and shown as real italic and bold in the editor.
 * One set of rules for every place an editor types formatted text: the manuscript's visual editor and each short field
 * (side notes, glossary, characters, places, times, the card note). The editor never sees an asterisk; storage never changes.
 */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The editor writes a literal "*" as "\*" and a literal "\" as "\\"; reading it back undoes that, so a round trip is stable. */
export function unescapeLiteral(value: string): string {
  return value.replace(/\\([\\*])/g, "$1");
}

/** The numbers of side notes in the text become chips when `notes` is given (see lib/admin/visual-notes.ts). */
export function inlineHtml(value: string, notes?: NoteContext): string {
  const text = (part: string) => (notes ? withNoteChips(escapeHtml(unescapeLiteral(part)), notes) : escapeHtml(unescapeLiteral(part)));
  return value.split(/((?<!\\)\*\*[^*\n]+?(?<!\\)\*\*|(?<!\\)\*[^*\n]+?(?<!\\)\*)/g).map((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return `<strong>${text(part.slice(2, -2))}</strong>`;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return `<em>${text(part.slice(1, -1))}</em>`;
    return text(part).replace(/\n/g, "<br>");
  }).join("");
}

/** The structure the serializer reads: what a DOM node offers, so it can also be read from a plain object in a test. */
export interface InlineNode {
  nodeType: number;
  textContent: string | null;
  tagName?: string;
  dataset?: Record<string, string | undefined>;
  childNodes: ArrayLike<InlineNode>;
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** A DOM node back to storage: <em> to *…*, <strong> to **…**, <br> to a new line, a literal * or \ escaped. */
export function inlineMarkdown(node: InlineNode): string {
  if (node.nodeType === TEXT_NODE) return (node.textContent ?? "").replace(/\\/g, "\\\\").replace(/\*/g, "\\*");
  if (node.nodeType !== ELEMENT_NODE) return "";
  const tag = node.tagName;
  if (tag === "BR") return "\n";
  // A side note's chip is written back as its number in the text; the note's words are written after the text (see the manuscript editor).
  if (tag === "SUP" && node.dataset?.note) return `[^${node.dataset.note}]`;
  const body = Array.from(node.childNodes).map(inlineMarkdown).join("");
  if (tag === "STRONG" || tag === "B") return `**${body}**`;
  if (tag === "EM" || tag === "I") return `*${body}*`;
  if (tag === "DIV" || tag === "P") return `${body}\n`;
  return body;
}

/**
 * The stored text of a short field, read from what is in the box.
 * A browser leaves non-breaking spaces and a trailing line break behind; neither belongs in the stored text.
 * A one-line field has no line breaks at all.
 */
export function fieldValueFromNodes(nodes: ArrayLike<InlineNode>, multiline: boolean): string {
  const text = Array.from(nodes).map(inlineMarkdown).join("").replace(/ /g, " ").replace(/\n+$/g, "");
  return multiline ? text : text.replace(/\s*\n\s*/g, " ");
}
