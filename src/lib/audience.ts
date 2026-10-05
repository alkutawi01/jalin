/**
 * Audience ("Audiens"): who a work is for, as a short fixed list instead of free text, so it can be filtered when there are many works.
 *
 * The bands (label and age range) are set by the editor in Tetapan and kept in `prompt_templates` (scope "audience_bands", one row per
 * version, newest active wins), so no migration is needed. A work stores the CODES of the bands it is for, separated by commas, in the
 * existing `audience` column ("remaja", "belia,dewasa"). Older values still read correctly: an age range ("13-17", "18-50") counts as
 * every band it overlaps, and a band's label ("Remaja") counts as that band. Nothing in the database needs converting.
 */

import { getDb, hasDb } from "./db";

export interface AudienceBand {
  code: string;
  label: string;
  /** Youngest age in years. */
  min: number;
  /** Oldest age in years; null means "and above". */
  max: number | null;
}

export const DEFAULT_AUDIENCE_BANDS: AudienceBand[] = [
  { code: "kanak-kanak", label: "Kanak-kanak", min: 7, max: 12 },
  { code: "remaja", label: "Remaja", min: 13, max: 17 },
  { code: "belia", label: "Belia", min: 18, max: 29 },
  { code: "dewasa", label: "Dewasa", min: 30, max: null }
];

/** What a new draft is for until the editor chooses. */
export const DEFAULT_AUDIENCE = "remaja";

export const MAX_BANDS = 8;
const SCOPE = "audience_bands";
const NAME = "bands";

const fold = (value: string) => value.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().trim();

export function bandRangeLabel(band: AudienceBand): string {
  return band.max === null ? `${band.min}+` : `${band.min}–${band.max}`;
}

/**
 * The band codes a stored value means, in the order of the bands. Accepts codes ("belia,dewasa"), labels ("Remaja") and older age
 * ranges ("13-17", "18-50": every band the range overlaps). Anything else means no band.
 */
export function audienceCodes(raw: string | null | undefined, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const found = new Set<string>();
  for (const token of text.split(/[,;/]+/).map(fold).filter(Boolean)) {
    const band = bands.find((b) => b.code === token || fold(b.label) === token);
    if (band) found.add(band.code);
  }
  const range = /(\d{1,2})\s*[-–]\s*(\d{1,2})/.exec(text);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (hi >= lo) for (const b of bands) if (lo <= (b.max ?? 200) && hi >= b.min) found.add(b.code);
  }
  return bands.filter((b) => found.has(b.code)).map((b) => b.code);
}

/** The value to store for these codes (only known codes, in band order). */
export function audienceValue(codes: string[], bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): string {
  return bands.filter((b) => codes.includes(b.code)).map((b) => b.code).join(",");
}

/** For import: whatever the chatbot wrote ("13-17") as a stored value; nothing recognisable gives the default. */
export function normalizeAudience(raw: string | null | undefined, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): string {
  return audienceValue(audienceCodes(raw, bands), bands) || DEFAULT_AUDIENCE;
}

/** "Remaja · Belia" for the stored value. */
export function audienceLabels(raw: string | null | undefined, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): string {
  const codes = audienceCodes(raw, bands);
  return bands.filter((b) => codes.includes(b.code)).map((b) => b.label).join(" · ");
}

/** The ages covered, for search engines: from the youngest band to the oldest one chosen (null when none, or when it has no upper age). */
export function audienceAgeRange(raw: string | null | undefined, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): { min: number; max: number } | null {
  const chosen = bands.filter((b) => audienceCodes(raw, bands).includes(b.code));
  if (chosen.length === 0) return null;
  const min = Math.min(...chosen.map((b) => b.min));
  const open = chosen.some((b) => b.max === null);
  return { min, max: open ? 99 : Math.max(...chosen.map((b) => b.max as number)) };
}

/** Checks the bands an editor typed in Tetapan. Throws a Malay message the form can show. */
export function validateBands(input: unknown): AudienceBand[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Sekurang-kurangnya satu peringkat diperlukan.");
  if (input.length > MAX_BANDS) throw new Error(`Paling banyak ${MAX_BANDS} peringkat.`);
  const codes = new Set<string>();
  return input.map((entry, index) => {
    const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const label = String(row.label ?? "").trim().replace(/\s+/g, " ");
    const n = index + 1;
    if (!label) throw new Error(`Peringkat ${n}: nama diperlukan.`);
    if (label.length > 30) throw new Error(`Peringkat ${n}: nama terlalu panjang (maksimum 30 aksara).`);
    const min = Number(row.min);
    if (!Number.isInteger(min) || min < 0 || min > 99) throw new Error(`Peringkat ${n} (${label}): umur paling muda mesti nombor 0 hingga 99.`);
    const maxRaw = row.max === null || row.max === undefined || row.max === "" ? null : Number(row.max);
    if (maxRaw !== null && (!Number.isInteger(maxRaw) || maxRaw < min || maxRaw > 99)) throw new Error(`Peringkat ${n} (${label}): umur paling tua mesti nombor dari ${min} hingga 99, atau kosong (dan ke atas).`);
    // A band keeps its code once it has one, so works already marked for it stay marked when the editor renames it.
    let code = String(row.code ?? "").trim() || fold(label).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `peringkat-${n}`;
    if (codes.has(code)) code = `${code}-${n}`;
    codes.add(code);
    return { code, label, min, max: maxRaw };
  });
}

export async function loadAudienceBands(): Promise<AudienceBand[]> {
  if (!hasDb()) return DEFAULT_AUDIENCE_BANDS;
  try {
    const row = await getDb()
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", NAME)
      .where("status", "=", "active")
      .select(["prompt_text", "version"])
      .orderBy("version", "desc")
      .executeTakeFirst();
    if (row) return validateBands(JSON.parse(row.prompt_text));
  } catch {
    /* a missing or damaged row shows the default bands */
  }
  return DEFAULT_AUDIENCE_BANDS;
}

/** Saves the bands as the newest version; the default list removes the saved one. */
export async function saveAudienceBands(input: unknown): Promise<AudienceBand[]> {
  const bands = validateBands(input);
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction().execute(async (trx) => {
    const latest = await trx.selectFrom("prompt_templates").where("scope", "=", SCOPE).where("name", "=", NAME).select((eb) => eb.fn.max("version").as("max")).executeTakeFirst();
    await trx.updateTable("prompt_templates").set({ status: "inactive", updated_at: now }).where("scope", "=", SCOPE).where("name", "=", NAME).execute();
    if (JSON.stringify(bands) !== JSON.stringify(DEFAULT_AUDIENCE_BANDS)) {
      await trx
        .insertInto("prompt_templates")
        .values({ name: NAME, prompt_text: JSON.stringify(bands), scope: SCOPE, work_type: null, work_id: null, version: Number(latest?.max ?? 0) + 1, status: "active", created_at: now, updated_at: now })
        .execute();
    }
  });
  return bands;
}
