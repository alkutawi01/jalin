/**
 * The whole text of a work, or of a whole series, as one piece of plain text: what the editor downloads with one click to
 * hand to a chatbot, and what a rating is tied to.
 *
 * Pure: the service reads the rows, this puts them together.
 */
import { createHash } from "node:crypto";

export interface TextPart {
  /** "Bab 3: Tajuk" or "Episod 2: Tajuk"; empty for a text in one piece. */
  heading: string;
  body: string;
}

export interface FullText {
  title: string;
  /** "Cerpen", "Novela" or "Bersiri". */
  kindLabel: string;
  parts: TextPart[];
}

/** Pictures and their markers are not part of the reading text; notes stay as they are written. */
function clean(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/^\s*!\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/^\s*\[\[(?:gambar|image|visual)[^\]]*\]\]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assembleFullText(text: FullText): string {
  const lines: string[] = [`${text.title}`, `(${text.kindLabel})`, ""];
  for (const part of text.parts) {
    const body = clean(part.body);
    if (!body) continue;
    if (part.heading) lines.push(`=== ${part.heading} ===`, "");
    lines.push(body, "");
  }
  return lines.join("\n").trim() + "\n";
}

/** "Bab 3: Tajuk"; a title that only repeats the number ("BAB 3") is not said twice. */
export function partHeading(word: "Bab" | "Episod", position: number, title: string | null | undefined): string {
  const t = (title ?? "").trim();
  if (!t || new RegExp(`^(bab|episod)\\s*${position}$`, "i").test(t)) return `${word} ${position}`;
  return `${word} ${position}: ${t}`;
}

export const countTextWords = (text: string) => (text.match(/\S+/g) ?? []).length;

/** The same for the same text, whatever the line endings or the spaces at the ends of lines. */
export function textHash(text: string): string {
  const normal = text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  return createHash("sha256").update(normal, "utf8").digest("hex");
}

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no I, L, O, U, 0, 1: nothing a chatbot or an eye confuses

/**
 * A short code that says "this work, this text, this rubric". It goes into the prompt, the chatbot repeats it, and a pasted
 * answer whose code is not the code of the text as it is now is turned away (the wrong work, or the text has changed since).
 * Worked out from its three parts, so nothing has to be stored to check it.
 */
export function referenceCode(kind: "work" | "series", id: string, hash: string, rubricVersion: string): string {
  const digest = createHash("sha256").update(`${kind}|${id}|${hash}|${rubricVersion}`, "utf8").digest();
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[digest[i] % ALPHABET.length];
  return `JP-${out.slice(0, 4)}-${out.slice(4)}`;
}

/** A file name for the download: the slug, safe on any system. */
export function fullTextFileName(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "karya";
  return `${safe}-teks-penuh.txt`;
}
