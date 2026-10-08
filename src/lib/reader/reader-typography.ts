/**
 * The size of the story text and of its sub-headings, set in Tetapan by the chief editor (or the owner) for every work.
 *
 * Two numbers: the text of a work in px and its sub-headings (the h2 inside the story) in em of that text. Nothing saved means Jalin's own
 * sizes, which change with the width of the screen; a saved size is used at every width. The numbers are kept inside limits so a slip
 * cannot make a work unreadable.
 *
 * Stored like the home page colours (site-theme.ts): in `prompt_templates` as scope "reader_typography", name "story.body_px" or
 * "story.heading_em", prompt_text = the number. Each save is a new version and the newest active row wins, so no migration is needed.
 * Clearing a size removes the saved row. Reading never throws: a database problem shows Jalin's own sizes.
 */

import { getDb, hasDb } from "../db";

const SCOPE = "reader_typography";

export const BODY_PX = { min: 14, max: 28, step: 0.5, name: "story.body_px" } as const;
export const HEADING_EM = { min: 1, max: 2.4, step: 0.05, name: "story.heading_em" } as const;

export interface ReaderTypography {
  /** Size of the story text in px; null = Jalin's own sizes. */
  bodyPx: number | null;
  /** Size of the sub-headings in em of the story text; null = Jalin's own sizes. */
  headingEm: number | null;
}

export const NO_TYPOGRAPHY: ReaderTypography = { bodyPx: null, headingEm: null };

export class TypographyInputError extends Error {}

function clean(value: unknown, limits: { min: number; max: number; step: number }, label: string, unit: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(number)) throw new TypographyInputError(`${label} mesti nombor.`);
  if (number < limits.min || number > limits.max) {
    throw new TypographyInputError(`${label} mesti antara ${limits.min} dan ${limits.max} ${unit}.`);
  }
  // Snap to the step so the CSS holds a short, predictable number.
  const snapped = Math.round(number / limits.step) * limits.step;
  return Number(snapped.toFixed(2));
}

export const cleanBodyPx = (value: unknown) => clean(value, BODY_PX, "Saiz teks karya", "px");
export const cleanHeadingEm = (value: unknown) => clean(value, HEADING_EM, "Saiz tajuk bahagian", "em");

/** The CSS for the saved sizes ("" when nothing is saved). Only validated numbers reach it. `body` raises it above Jalin's own sizes at every width. */
export function typographyCss(typography: ReaderTypography): string {
  const rules: string[] = [];
  if (typography.bodyPx !== null) rules.push(`body .story-body{font-size:${typography.bodyPx}px}`);
  if (typography.headingEm !== null) rules.push(`body .story-body h2{font-size:${typography.headingEm}em}`);
  return rules.join("");
}

export async function listSavedTypography(): Promise<ReaderTypography> {
  const saved: ReaderTypography = { ...NO_TYPOGRAPHY };
  if (!hasDb()) return saved;
  const rows = await getDb()
    .selectFrom("prompt_templates")
    .where("scope", "=", SCOPE)
    .where("status", "=", "active")
    .select(["name", "prompt_text", "version"])
    .orderBy("version", "desc")
    .execute();
  for (const row of rows) {
    if (row.name === BODY_PX.name && saved.bodyPx === null) {
      try { saved.bodyPx = cleanBodyPx(row.prompt_text); } catch { /* a damaged row is ignored */ }
    }
    if (row.name === HEADING_EM.name && saved.headingEm === null) {
      try { saved.headingEm = cleanHeadingEm(row.prompt_text); } catch { /* a damaged row is ignored */ }
    }
  }
  return saved;
}

/** What the reader pages use. Never throws. */
export async function readerTypography(): Promise<ReaderTypography> {
  try {
    return await listSavedTypography();
  } catch {
    return { ...NO_TYPOGRAPHY };
  }
}

async function saveOne(name: string, value: number | null): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction().execute(async (trx) => {
    const latest = await trx
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .select((eb) => eb.fn.max("version").as("max"))
      .executeTakeFirst();
    await trx.updateTable("prompt_templates").set({ status: "inactive", updated_at: now }).where("scope", "=", SCOPE).where("name", "=", name).execute();
    if (value !== null) {
      await trx
        .insertInto("prompt_templates")
        .values({ name, prompt_text: String(value), scope: SCOPE, work_type: null, work_id: null, version: Number(latest?.max ?? 0) + 1, status: "active", created_at: now, updated_at: now })
        .execute();
    }
  });
}

/** Save both sizes (null clears one). Throws TypographyInputError for a number outside the limits. */
export async function saveReaderTypography(input: { bodyPx: unknown; headingEm: unknown }): Promise<ReaderTypography> {
  const bodyPx = cleanBodyPx(input.bodyPx);
  const headingEm = cleanHeadingEm(input.headingEm);
  await saveOne(BODY_PX.name, bodyPx);
  await saveOne(HEADING_EM.name, headingEm);
  return { bodyPx, headingEm };
}
