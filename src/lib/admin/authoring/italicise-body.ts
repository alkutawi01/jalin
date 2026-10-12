/**
 * Loanwords in the story text. The glossary already knows which words are foreign: the ones written between asterisks
 * in a glossary term or meaning (the "Asing:" line of the chatbot answer becomes exactly that). This turns the same words
 * into italics wherever they stand in the story text, so the editor does not have to mark each one by hand.
 *
 * Only whole words are touched, text that is already italic or bold is left alone, and headings are skipped.
 * A word followed by the Malay "-nya" ("tasmi'nya") is italicised without the "-nya", as it is written by hand.
 */

export interface ItaliciseResult {
  text: string;
  /** How many places were changed. */
  count: number;
  /** The foreign words that were found and how many times each was italicised. */
  perWord: Record<string, number>;
}

const ITALIC_SPAN = /\*([^*\n]+?)\*/g;

/** The foreign words of a glossary: every phrase written between single asterisks in a term or a meaning. */
export function foreignWordsOfGlossary(
  entries: Array<{ term?: string | null; meaning?: string | null; original_language?: string | null }>
): string[] {
  const found = new Map<string, string>();
  for (const entry of entries) {
    // A term with a language of origin other than Malay ("Arab", "Inggeris") is a loanword even when nobody marked it.
    const language = (entry.original_language ?? "").trim();
    if (language && !/melayu/i.test(language) && entry.term) {
      const plain = entry.term.replace(/\*/g, "").trim();
      if (plain.length >= 2) found.set(plain.toLocaleLowerCase("ms-MY"), plain);
    }
    for (const field of [entry.term, entry.meaning]) {
      if (!field) continue;
      // Bold (**x**) is not italic; remove it first so its asterisks do not pair up with a neighbour.
      const text = field.replace(/\*\*[^*\n]+\*\*/g, " ");
      for (const m of text.matchAll(ITALIC_SPAN)) {
        const word = (m[1] ?? "").trim();
        if (word.length < 2) continue;
        const key = word.toLocaleLowerCase("ms-MY");
        if (!found.has(key)) found.set(key, word);
      }
    }
  }
  return [...found.values()];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function italiciseBody(body: string, words: string[]): ItaliciseResult {
  const unique = [...new Set(words.map((w) => w.trim()).filter((w) => w.length >= 2))].sort((a, b) => b.length - a.length);
  const perWord: Record<string, number> = {};
  if (unique.length === 0 || !body) return { text: body, count: 0, perWord };

  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}*])(${unique.map(escapeRegex).join("|")})(?=nya(?![\\p{L}\\p{N}])|(?![\\p{L}\\p{N}*]))`,
    "giu"
  );
  let count = 0;

  const lines = body.split("\n").map((line) => {
    if (/^\s*#/.test(line) || /^\s*:::/.test(line)) return line;
    // Keep what is already emphasised: split into [plain, emphasised, plain, ...] and touch only the plain parts.
    const parts = line.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/);
    return parts
      .map((part, index) => {
        if (index % 2 === 1) return part;
        return part.replace(pattern, (match: string) => {
          count += 1;
          const key = unique.find((w) => w.toLocaleLowerCase("ms-MY") === match.toLocaleLowerCase("ms-MY")) ?? match;
          perWord[key] = (perWord[key] ?? 0) + 1;
          return `*${match}*`;
        });
      })
      .join("");
  });

  return { text: lines.join("\n"), count, perWord };
}
