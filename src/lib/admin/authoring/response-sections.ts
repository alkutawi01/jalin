/** Normalise heading syntax only; manuscript prose remains untouched. */
export function normaliseResponseLine(line: string): string {
  return line.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/\u00a0/g, " ").normalize("NFKC")
    .replace(/[【〔]/g, "[").replace(/[】〕]/g, "]")
    .replace(/\\([[\]_*#>:-])/g, "$1");
}

/** Recognise boundaries even when this importer does not own the next section. */
export function responseSection(line: string): string | null {
  const value = normaliseResponseLine(line).trim();
  const bracketed = /^(?:[#>*_\-•]+\s*)*(?:\d+[.)]\s*)?\[\s*([A-Za-z][A-Za-z &/-]{1,50})\s*\]\s*[:：]?\s*[*_]*\s*[:：]?$/.exec(value);
  if (bracketed) return bracketed[1]!.toUpperCase();
  // "Bab:" inside a visual is an empty field, not the start of the chapter section.
  if (/[:：]\s*$/.test(value) && !/^#/.test(value) && value !== value.toUpperCase()) return null;
  const heading = value.replace(/^[#>*_\-•\s]+/, "").replace(/[*_:：\s]+$/, "").toUpperCase();
  return /^(MAKLUMAT|KARYA|SIRI|KANDUNGAN|BAB|SUMBER|WATAK|LATAR|GLOSARI|GAMBAR|KREDIT|HAK|NOTA EDITOR)$/.test(heading) ? heading : null;
}

export function responseSectionText(answer: string, wanted: string): string {
  const lines = answer.replace(/\r\n/g, "\n").split("\n");
  if (!lines.some(line => responseSection(line))) return answer;
  let active = false;
  const kept: string[] = [];
  for (const line of lines) {
    const section = responseSection(line);
    if (section) { active = section === wanted; continue; }
    if (/^\s*\[\//.test(normaliseResponseLine(line))) { active = false; continue; }
    if (active) kept.push(line);
  }
  return kept.join("\n");
}
