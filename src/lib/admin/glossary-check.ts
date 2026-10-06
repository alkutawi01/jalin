import { glossaryPattern } from "../reader/glossary-first";

export interface GlossaryTermProblem {
  term: string;
  /** The longer word the text does use for this term (for "ametis": "ametisnya"), or null. */
  suggestion: string | null;
}

/**
 * Glossary terms that never occur in the text as a whole word, so the reader would never show their tooltip. The match is the reader's own
 * (Unicode word boundaries), so "ametis" does not match "ametisnya". Each problem carries the longer word the text does use, if there is one.
 */
export function glossaryTermsMissingFromText(terms: string[], text: string): GlossaryTermProblem[] {
  const problems: GlossaryTermProblem[] = [];
  for (const raw of terms) {
    const term = raw.trim();
    if (!term) continue;
    const pattern = glossaryPattern([term]);
    if (pattern && pattern.test(text)) continue;
    const escaped = term.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
    const longer = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}[\\p{L}\\p{N}]+`, "iu").exec(text);
    problems.push({ term, suggestion: longer ? longer[0] : null });
  }
  return problems;
}
