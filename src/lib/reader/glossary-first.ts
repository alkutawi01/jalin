export type GlossaryEntries = Record<string, { meaning: string; termDisplay?: string }>;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

/** Unicode word boundaries prevent e.g. 'minyak' matching inside a longer word. */
export function glossaryPattern(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  const alternatives = [...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, "giu");
}

function eligibleProse(markdown: string): string {
  let inCode = false;
  return markdown.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inCode = !inCode; return ""; }
    if (inCode || /^\s*(#{1,6}\s|>|[-*+]\s|\d+\.\s)/.test(line)) return "";
    return line.replace(/`[^`]*`/g, "");
  }).join("\n");
}

/** Allocate each glossary term to its first prose segment, not every image-split segment. */
export function firstGlossaryBySegment<T>(segments: (string | T)[], glossary: GlossaryEntries): GlossaryEntries[] {
  const terms = Object.keys(glossary);
  const pattern = glossaryPattern(terms);
  const seen = new Set<string>();
  return segments.map((segment) => {
    const entries: GlossaryEntries = {};
    if (typeof segment !== "string" || !pattern) return entries;
    for (const match of eligibleProse(segment).matchAll(pattern)) {
      const term = terms.find((candidate) => candidate.toLocaleLowerCase("ms") === match[1]!.toLocaleLowerCase("ms"));
      if (!term || seen.has(term)) continue;
      seen.add(term);
      entries[term] = glossary[term];
    }
    return entries;
  });
}
