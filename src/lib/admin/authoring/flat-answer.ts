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
  const tidy = text.split(/\r?\n/).filter((line) => tagLine.test(line)).length >= 2;

  const all = [...new Set([...labels, ...EXTRA_LABELS])].sort((a, b) => b.length - a.length).map(escapeRe);
  const inlineLabel = new RegExp(`(?:\\s+|(?<=[.!?]))(?=(?:${all.join("|")})\\s*:)`, "g");
  const startsWithLabel = new RegExp(`^\\s*(?:${all.join("|")})\\s*:`);
  const lines = (body: string, title: boolean) => {
    const split = body.trim().replace(/\s*_{3,}\s*/g, "\n____\n").replace(inlineLabel, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
    if (title && split.length > 0 && !startsWithLabel.test(split[0]!)) split[0] = `Tajuk: ${split[0]}`;
    // A list of items (glossary, characters, places) separated only by blank lines loses them here: the label every item starts with, seen
    // again, starts a new item, so it gets the ____ separator the format asks for.
    const first = /^([^:]{1,30}):/.exec(split[0] ?? "")?.[1];
    if (!first) return split;
    const result: string[] = [];
    split.forEach((line, index) => {
      if (index > 0 && line.startsWith(`${first}:`) && result[result.length - 1] !== "____") result.push("____");
      result.push(line);
    });
    return result;
  };

  const parts = text.split(tag);
  if (tidy) {
    // The tags are on their own lines, but a line may hold a whole item ("Istilah: kuda padi Maksud: ... Asing: tiada", one item per paragraph).
    // Only then is the answer rebuilt; the prose is kept exactly as it came.
    const crowded = parts.some((part, index) => index % 2 === 0 && index > 0 && parts[index - 1]!.toUpperCase() !== "KANDUNGAN"
      && part.split(/\r?\n/).some((line) => (line.match(new RegExp(`(?:^|\\s)(?:${all.join("|")})\\s*:`, "g")) ?? []).length >= 2));
    if (!crowded) return answer;
  }
  const out: string[] = [];
  if (parts[0]!.trim()) out.push("[KARYA]", ...lines(parts[0]!, true));
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i]!.toUpperCase();
    out.push(`[${name}]`);
    const body = parts[i + 1] ?? "";
    if (tidy && name === "KANDUNGAN") { out.push(body.trim()); continue; }
    // ChatGPT's Copy button gives plain text with no line breaks at all: a paragraph ends with a full stop and TWO spaces. In the prose that is
    // a paragraph break (one space between sentences is kept).
    // Another copy comes out with the paragraphs simply run together: "...dengan William.Pengalaman itu..." (a full stop, then a capital letter with
    // no space at all, which prose never has). That too is a paragraph break.
    if (name === "KANDUNGAN") out.push(body.trim().replace(/[ \t]{2,}/g, "\n\n").replace(/([a-zà-ÿ0-9][.!?]["”’]?)(?=[A-ZÀ-Ý“"‘])/g, "$1\n\n"));
    else out.push(...lines(body, name === "KARYA"));
  }
  return out.join("\n");
}

/** ChatGPT shows a web address as a link to itself with its own tracking tag: "[https://x.org/a](https://x.org/a?utm_source=chatgpt.com)". Only the address is meant. */
export function collapseLinks(answer: string): string {
  return answer.replace(/\[(https?:\/\/[^\]\s]+)\]\((https?:\/\/[^)\s]+)\)/g, (_all, shown: string) => shown.replace(/[?&]utm_source=chatgpt\.com$/i, ""));
}
