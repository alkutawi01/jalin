/**
 * A chat window can hand over an answer whose line breaks are gone: every section tag and label sits in one long line ("Anak-anak Kereta Api
 * Slug: anak-anak-kereta-api Blurb: ... [KANDUNGAN] Roberta ..."), and the opening "[KARYA] Tajuk:" may be missing. Put the line breaks back
 * where a section tag or a known label begins, and call a first line that carries no label the title. Story prose (KANDUNGAN) is not touched.
 * An answer that already has its tags on lines of their own is returned as it came.
 */

const SECTION_TAGS = "KARYA|MAKLUMAT KARYA|MAKLUMAT|SIRI|KANDUNGAN|BAB|SUMBER|WATAK|LATAR|GLOSARI|GAMBAR|VISUAL|KREDIT|HAK|NOTA EDITOR";
const EXTRA_LABELS = ["Catatan", "Nota pembaca", "Tahun edisi", "Nama edisi", "URL sumber", "Slug penyumbang", "Nama tetamu", "Nama di bawah tajuk", "Paparan awam"];

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);

export function restoreFlatAnswer(answer: string, labels: string[]): string {
  const text = answer.replace(/<\/?(?:escape|text)(?:\s[^>]*)?>/gi, "");
  const tag = new RegExp(`\\[\\s*(${SECTION_TAGS})\\s*\\]`, "gi");
  if ((text.match(tag) ?? []).length < 2) return answer;
  const tagLine = new RegExp(`^\\s*[#>*]*\\s*\\**\\[\\s*(?:${SECTION_TAGS})\\s*\\]\\**\\s*:?\\s*$`, "i");
  if (text.split(/\r?\n/).filter((line) => tagLine.test(line)).length >= 2) return answer;

  const all = [...new Set([...labels, ...EXTRA_LABELS])].sort((a, b) => b.length - a.length).map(escapeRe);
  const inlineLabel = new RegExp(`\\s+(?=(?:${all.join("|")})\\s*:)`, "g");
  const startsWithLabel = new RegExp(`^\\s*(?:${all.join("|")})\\s*:`);
  const lines = (body: string, title: boolean) => {
    const split = body.trim().replace(/\s*_{3,}\s*/g, "\n____\n").replace(inlineLabel, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
    if (title && split.length > 0 && !startsWithLabel.test(split[0]!)) split[0] = `Tajuk: ${split[0]}`;
    return split;
  };

  const parts = text.split(tag);
  const out: string[] = [];
  if (parts[0]!.trim()) out.push("[KARYA]", ...lines(parts[0]!, true));
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i]!.toUpperCase();
    out.push(`[${name}]`);
    const body = parts[i + 1] ?? "";
    if (name === "KANDUNGAN") out.push(body.trim());
    else out.push(...lines(body, name === "KARYA"));
  }
  return out.join("\n");
}
