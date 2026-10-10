/**
 * Panel Bacaan AI: reads what a reviewer (a chatbot) answered, in the one format every model must use (JALIN_PANEL_V2: one field per
 * line, fixed labels, K1 to K6). The answer is untrusted text, so this is strict about SHAPE: a wrong code, a missing or repeated line,
 * an unknown label, a score off the grid or an opening/closing quote that is not the start/end of the text is refused with a reason,
 * never "fixed". What a chat window adds around the block (bullets, bold marks, chatter) is tolerated and reported.
 * Quoted evidence is checked against the exact snapshot text; a quote not found does not refuse the rating, it is flagged on it.
 */
import { COMPONENTS, FORMAT_NAME, LIMITS, validScore, type ComponentKey } from "./rubric";

export interface ParsedComponent { key: ComponentKey; code: string; score: number; evidence: string; reason: string; evidenceOk: boolean }
export interface ParsedRating {
  code: string;
  modelClaimed: string;
  verdict: string;
  components: ParsedComponent[];
  warnings: string[];
}
export type ParseOutcome = { ok: true; rating: ParsedRating } | { ok: false; errors: string[] };

/** What a chat window does to text: bold marks, bullets, curly quotes, dashes, spacing. Compared after both sides are normalised the same way. */
export function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/ /g, " ")
    // Formatting and quotation marks are not part of what was said: the stored text carries Markdown emphasis (*qasab*), a chat window
    // removes it, escapes quotes with a backslash, or drops the closing mark of a line of dialogue. Both sides lose them.
    .replace(/[*_`\\]/g, "")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Where in the text (0 to 100) a quote starts, from its first findable fragment; null when it cannot be found (a model that quotes the
 * meaning, not the letters, is normal and is not an error). Used for the map of which parts of the work the reviewer drew on.
 */
export function evidencePosition(quote: string, snapshotNormalised: string): number | null {
  const fragments = normalise(quote).split(/\s*(?:\u2026|\.{3})\s*/).map((f) => f.replace(/^["' ]+|["' ]+$/g, "")).filter((f) => f.length >= 8);
  for (const fragment of fragments) {
    const at = snapshotNormalised.indexOf(fragment);
    if (at >= 0) return Math.round((at / Math.max(1, snapshotNormalised.length)) * 100);
  }
  return null;
}

/** True when every fragment of the quote (split at an ellipsis) is found, in order, in the text. */
export function evidenceFound(quote: string, snapshotNormalised: string): boolean {
  const fragments = normalise(quote).split(/\s*(?:…|\.{3})\s*/).map((f) => f.replace(/^["' ]+|["' ]+$/g, "")).filter((f) => f.length >= 8);
  if (fragments.length === 0) return false;
  let from = 0;
  for (const fragment of fragments) {
    const at = snapshotNormalised.indexOf(fragment, from);
    if (at < 0) return false;
    from = at + fragment.length;
  }
  return true;
}

function cleanLine(line: string): string {
  return line.replace(/^[\s>*\-•#]+/, "").replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "").trim();
}

const TOP = ["FORMAT", "KOD", "MODEL", "VERDIK", "BUKTI_AWAL", "BUKTI_AKHIR"] as const;
const FIELD_LABELS: string[] = [...TOP, "TAMAT", ...COMPONENTS.flatMap((c) => [`${c.code}_SKOR`, `${c.code}_BUKTI`, `${c.code}_SEBAB`])];
const MIN_REASON = 20;

export function parseRating(raw: string, expected: { code: string; snapshotText: string }): ParseOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n").map(cleanLine);

  const isStart = (l: string) => /^FORMAT\s*:\s*JALIN_PANEL_V2\s*$/.test(l);
  const isEnd = (l: string) => /^TAMAT\s*:\s*JALIN_PANEL_V2\s*$/.test(l);
  const starts = lines.filter(isStart).length;
  const ends = lines.filter(isEnd).length;
  if (starts !== 1 || ends !== 1) return { ok: false, errors: [starts === 0 ? `Baris "FORMAT: ${FORMAT_NAME}" tidak ditemui.` : `Perlu tepat satu blok FORMAT ... TAMAT (ditemui ${starts} permulaan, ${ends} penutup).`] };
  const from = lines.findIndex(isStart);
  const to = lines.findIndex(isEnd);
  if (to < from) return { ok: false, errors: ["TAMAT berada sebelum FORMAT."] };
  if (lines.slice(0, from).some(Boolean) || lines.slice(to + 1).some(Boolean)) warnings.push("Ada teks di luar blok; ia diabaikan.");

  // A line that does not start with a known label continues the previous field (chat windows wrap long lines).
  const known = new Set(FIELD_LABELS);
  const fields = new Map<string, string>();
  let current: string | null = null;
  for (const line of lines.slice(from + 1, to)) {
    if (!line) continue;
    const match = /^([A-Z][A-Z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (match) {
      const label = match[1]!;
      if (!known.has(label)) { errors.push(`Label tidak dikenali: ${label}.`); current = null; continue; }
      if (fields.has(label)) { errors.push(`Label ${label} berulang.`); current = null; continue; }
      fields.set(label, match[2]!.trim());
      current = label;
    } else if (current) {
      fields.set(current, `${fields.get(current)} ${line}`.trim());
    } else {
      errors.push(`Baris tidak difahami sebelum sebarang label: "${line.slice(0, 60)}".`);
    }
  }

  const code = fields.get("KOD") ?? "";
  if (code !== expected.code) errors.push(`KOD tidak sepadan (diterima "${code.slice(0, 20)}"): jawapan ini mungkin untuk karya atau versi lain.`);
  for (const required of ["MODEL", "VERDIK", "BUKTI_AWAL", "BUKTI_AKHIR"]) if (!fields.get(required)) errors.push(`Label ${required} hilang atau kosong.`);
  const verdict = fields.get("VERDIK") ?? "";
  if (verdict.length > LIMITS.verdict) warnings.push(`VERDIK melebihi ${LIMITS.verdict} aksara (${verdict.length}).`);

  const snapshotNormalised = normalise(expected.snapshotText);
  // Proof that the reviewer was given the whole text and not a cut-off of it: it must copy a passage from the very start and one from the
  // end. "The end" is the last 30% of the text, not the last line: a work may close with notes or sources after the story, and a
  // reviewer that only received the first part cannot quote anything from the last 30%.
  const edgeOk = (label: "BUKTI_AWAL" | "BUKTI_AKHIR") => {
    const quote = normalise(fields.get(label) ?? "").replace(/^["' ]+|["' ]+$/g, "");
    if (quote.length < 12) return false;
    const length = snapshotNormalised.length;
    if (label === "BUKTI_AWAL") {
      const at = snapshotNormalised.indexOf(quote);
      return at >= 0 && at <= Math.max(700, Math.floor(length * 0.15));
    }
    return snapshotNormalised.indexOf(quote, Math.min(Math.max(0, length - 700), Math.floor(length * 0.7))) >= 0;
  };
  if (fields.get("BUKTI_AWAL") && !edgeOk("BUKTI_AWAL")) errors.push("BUKTI_AWAL tidak sepadan dengan permulaan teks: penilai mungkin tidak menerima keseluruhan teks atau teks telah diubah.");
  if (fields.get("BUKTI_AKHIR") && !edgeOk("BUKTI_AKHIR")) errors.push("BUKTI_AKHIR tidak sepadan dengan bahagian akhir teks (30% terakhir): penilai mungkin tidak menerima keseluruhan teks (terpotong).");

  const components: ParsedComponent[] = [];
  for (const c of COMPONENTS) {
    const scoreText = (fields.get(`${c.code}_SKOR`) ?? "").trim();
    const evidence = (fields.get(`${c.code}_BUKTI`) ?? "").trim();
    const reason = (fields.get(`${c.code}_SEBAB`) ?? "").trim();
    let bad = false;
    if (!scoreText) { errors.push(`${c.code}_SKOR hilang.`); bad = true; }
    else if (!/^\d+([.,]\d+)?$/.test(scoreText) || !validScore(Number(scoreText.replace(",", ".")))) { errors.push(`${c.code}_SKOR "${scoreText.slice(0, 12)}" tidak sah (1 hingga 10, langkah 0.5; tiada N/A).`); bad = true; }
    if (!evidence) { errors.push(`${c.code}_BUKTI hilang.`); bad = true; }
    if (!reason) { errors.push(`${c.code}_SEBAB hilang.`); bad = true; }
    else if (reason.length < MIN_REASON) { errors.push(`${c.code}_SEBAB terlalu ringkas: sebab mesti menerangkan skor.`); bad = true; }
    if (bad) continue;
    const ok = evidenceFound(evidence, snapshotNormalised);
    if (!ok) warnings.push(`Rujukan ${c.code} bukan petikan harfiah daripada teks (mungkin diolah semula).`);
    if (evidence.length > LIMITS.evidence + 40) warnings.push(`${c.code}_BUKTI panjang (${evidence.length} aksara).`);
    if (reason.length > LIMITS.reason + 80) warnings.push(`${c.code}_SEBAB panjang (${reason.length} aksara).`);
    components.push({ key: c.key, code: c.code, score: Number(scoreText.replace(",", ".")), evidence, reason, evidenceOk: ok });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rating: { code, modelClaimed: fields.get("MODEL") ?? "", verdict, components, warnings } };
}
