/** Recover layout mistakes only. Unknown labels/values are never guessed. Story prose is untouched. */
import { unescapeSeparatorRuns } from "../../separator-marks";
export function normaliseLabelledLayout(answer: string, labels: string[], proseSection = "KANDUNGAN", acceptStructured = true): string {
  // A chat window copies a row of underscores out as \_\_\_\_ ; that is the separator, not text.
  answer = unescapeSeparatorRuns(answer);
  if (acceptStructured) answer = structuredAnswer(answer, labels);
  const canonical = new Map(labels.map(label => [label.toLocaleLowerCase().replace(/[_\s-]+/g, " ").trim(), label]));
  const known = (value: string) => canonical.get(value.replace(/\*\*|__|`/g, "").replace(/^[#>*•\s-]+/, "").trim().toLocaleLowerCase().replace(/[_\s-]+/g, " "));
  let prose = false;
  let tableColumns: Array<string | undefined> | null = null;
  const out: string[] = [];
  for (const original of answer.replace(/\r\n?/g, "\n").split("\n")) {
    const structural = original.normalize("NFKC").replace(/[\u200b-\u200f\ufeff]/g, "").replace(/<\/?(?:escape|text)(?:\s[^>]*)?>/gi, "");
    const header = /^\s*(?:[#>*]+\s*)?\**\[\s*([A-Za-z &/-]+)\s*\]\**\s*[:：]?\s*(.*)$/.exec(structural);
    if (header) {
      // Only actual import sections, not story markers such as [MESEJ].
      if (/^(KARYA|MAKLUMAT(?: KARYA)?|SIRI|KANDUNGAN|BAB|SUMBER|WATAK|LATAR(?: TEMPAT DAN MASA)?|GLOSARI|GAMBAR|VISUAL|KREDIT|HAK|NOTA EDITOR)$/i.test(header[1]!.trim())) {
        prose = header[1]!.trim().toUpperCase() === proseSection;
        out.push(`[${header[1]!.trim().toUpperCase()}]`);
        if (!header[2]) continue;
        if (prose) { out.push(header[2]); continue; }
        out.push(normaliseLabelledLayout(header[2], labels, proseSection));
        continue;
      }
    }
    if (prose) { out.push(original); continue; }
    if (/^\s*\|?\s*:?-{3,}:?\s*\|/.test(structural)) continue;
    const cells = structural.trim().replace(/^\||\|$/g, "").split("|").map(v => v.trim());
    if (cells.length > 1 && cells.filter(cell => known(cell)).length >= 2) { tableColumns = cells.map(known); continue; }
    if (cells.length > 1 && tableColumns?.length === cells.length) {
      out.push(...cells.flatMap((value, index) => tableColumns![index] ? [`${tableColumns![index]}: ${value}`] : []));
      if (!labels.includes("FORMAT")) out.push("____");
      continue;
    }
    if (cells.length === 1) tableColumns = null;
    if (cells.length === 2 && known(cells[0]!)) { out.push(`${known(cells[0]!)}: ${cells[1]}`); continue; }
    const match = /^\s*(?:[-*•>]\s*|\d+[.)]\s*)?\**(.{1,55}?)\**\s*(?:[:：=]|\s+[–—-]\s+)\s*(.*)$/.exec(structural);
    if (match && known(match[1]!)) { out.push(`${known(match[1]!)}: ${match[2]!.replace(/^\*\*\s*/, "")}`); continue; }
    const label = known(structural);
    out.push(label ? `${label}:` : original);
  }
  // A label and its value may be separated by one or several blank lines.
  const joined: string[] = [];
  prose = false;
  for (let i = 0; i < out.length; i++) {
    let line = out[i]!;
    if (/^\[KANDUNGAN\]$/i.test(line)) prose = true;
    else if (/^\[[A-Z &/-]+\]$/.test(line)) prose = false;
    const empty = /^(.{1,55}):\s*$/.exec(line);
    if (!prose && empty && known(empty[1]!)) {
      let next = i + 1;
      while (next < out.length && !out[next]!.trim()) next++;
      const value = out[next]?.trim();
      const nextField = /^(.{1,55}):/.exec(value ?? "");
      if (value && !/^\[|^[_=*-]{3,}$/.test(value) && !(nextField && known(nextField[1]!))) { line += ` ${value}`; i = next; }
    }
    joined.push(line);
  }
  return joined.join("\n");
}

/** Accept a structured JSON answer as an alternative wrapper; map only explicit known fields. */
function structuredAnswer(answer: string, labels: string[]): string {
  const candidate = /^\s*\{/.test(answer) ? answer.trim() : /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i.exec(answer)?.[1];
  if (!candidate) return answer;
  let root: Record<string, unknown>;
  try { root = JSON.parse(candidate); } catch { return answer; }
  if (!root || typeof root !== "object" || Array.isArray(root)) return answer;
  if (labels.includes("FORMAT")) return Object.entries(root).map(([key, value]) => `${key}: ${typeof value === "string" || typeof value === "number" ? value : JSON.stringify(value)}`).join("\n");
  const out: string[] = [];
  const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const fields = (v: unknown, mapping: Record<string, string>) => {
    const row = record(v);
    return Object.entries(mapping).flatMap(([key, label]) => typeof row[key] === "string" || typeof row[key] === "number" ? [`${label}: ${String(row[key]).replace(/\r\n?/g, "\n")}`] : []);
  };
  const group = (name: string, rows: string[]) => { if (rows.length) out.push(`[${name}]`, ...rows); };
  const work = Object.keys(record(root.work)).length ? record(root.work) : { ...root, ...record(root.metadata) };
  group("KARYA", fields(work, { type: "Jenis", title: "Tajuk", slug: "Slug", dek: "Blurb", genre: "Genre", author: "Penulis" }));
  if (typeof root.content === "string") group("KANDUNGAN", [root.content]);
  group("SIRI", fields(root.series, { title: "Tajuk siri", mode: "Mod", dek: "Blurb siri" }));
  group("SUMBER", fields(root.source, { title: "Tajuk asal", originalTitle: "Tajuk asal", author: "Pengarang asal", language: "Bahasa asal", originalLanguage: "Bahasa asal", publicationYear: "Tahun terbit pertama", publisher: "Penerbit", editionYear: "Tahun cetakan", printing: "Cetakan ke", editor: "Penyunting", translator: "Penterjemah", isbn: "ISBN", locator: "Lokasi petikan", basis: "Asas teks" }));
  const list = (name: string, data: unknown, mapping: Record<string, string>) => {
    if (Array.isArray(data)) group(name, data.flatMap(item => [...fields(item, mapping), "____"]));
  };
  list("WATAK", root.characters, { name: "Nama", role: "Peranan", description: "Penerangan", firstAppearanceSection: "Muncul di" });
  list("GLOSARI", root.glossary, { term: "Istilah", meaning: "Maksud", pronunciation: "Sebutan", original: "Ejaan asal", originalText: "Ejaan asal", originalLanguage: "Bahasa asal" });
  list("BAB", root.sections, { order: "Nombor", position: "Nombor", slug: "Slug", title: "Tajuk", headingText: "Tajuk dalam manuskrip", summary: "Ringkasan" });
  const settings = record(root.settings);
  for (const [key, kind] of [["places", "tempat"], ["times", "masa"]] as const) {
    const rows = settings[key] ?? root[key];
    if (Array.isArray(rows)) group("LATAR", rows.flatMap(row => [`Jenis: ${kind}`, ...fields(row, { name: "Nama", description: "Keterangan" }), "____"]));
  }
  // Image JSON already has a dedicated validated import path; never reinterpret its scene prose.
  if (root.visuals !== undefined || root.images !== undefined) return answer;
  return out.length ? out.join("\n") : answer;
}

export const AUTHORING_LABELS = ["Jenis", "Type", "Tajuk", "Title", "Slug", "Blurb", "Blurb siri", "Dek", "Dek siri", "Ringkasan", "Genre", "Penulis", "Pengarang", "Anggaran bacaan", "Nama", "Peranan", "Penerangan", "Keterangan", "Muncul di", "Muncul", "Kemunculan pertama", "Nombor", "Bab", "Tajuk dalam manuskrip", "Tajuk siri", "Mod", "Dek siri", "Tajuk asal", "Pengarang asal", "Penulis asal", "Bahasa asal", "Asal-usul", "Tahun terbit pertama", "Penerbit", "Tahun cetakan", "Cetakan ke", "Penyunting", "Penterjemah", "ISBN", "Lokasi petikan", "Asas teks", "Istilah", "Term", "Perkataan", "Maksud", "Makna", "Meaning", "Definisi", "Takrif", "Asing", "Sebutan", "Ejaan asal", "Petikan", "Letak", "Nisbah", "Adegan", "Bukan dalam adegan", "Muka", "Alt", "Sebab"];
