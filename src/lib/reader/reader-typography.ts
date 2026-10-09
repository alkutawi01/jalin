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
import { DEVICES, DEVICE_IDS, deviceInfo, type DeviceId } from "./typography-devices";

const SCOPE = "reader_typography";

export const BODY_PX = { min: 14, max: 28, step: 0.5, name: "story.body_px" } as const;
export const HEADING_EM = { min: 1, max: 2.4, step: 0.05, name: "story.heading_em" } as const;

/** A size kept for one kind of screen is stored under the same name with the kind added: "story.body_px.phone". The name without it is for every screen (how sizes were kept before). */
export const deviceRowName = (base: string, id: DeviceId) => `${base}.${id}`;

export interface DeviceSizes {
  bodyPx: number | null;
  headingEm: number | null;
}

export interface ReaderTypography {
  /** Size of the story text in px at every width; null = Jalin's own sizes. */
  bodyPx: number | null;
  /** Size of the sub-headings in em of the story text at every width; null = Jalin's own sizes. */
  headingEm: number | null;
  /** Sizes for one kind of screen only (they win over the two above on that screen). */
  devices?: Partial<Record<DeviceId, DeviceSizes>>;
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
  // A size for one kind of screen sits in that screen's own media query, after the ones for every screen, so it wins there.
  for (const device of DEVICES) {
    const sizes = typography.devices?.[device.id];
    if (!sizes) continue;
    const inner: string[] = [];
    if (sizes.bodyPx !== null) inner.push(`body .story-body{font-size:${sizes.bodyPx}px}`);
    if (sizes.headingEm !== null) inner.push(`body .story-body h2{font-size:${sizes.headingEm}em}`);
    if (inner.length > 0) rules.push(`@media ${device.media}{${inner.join("")}}`);
  }
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
  const seen = new Set<string>();
  for (const row of rows) {
    // The newest version of each name wins; a damaged or older row is ignored.
    if (seen.has(row.name)) continue;
    if (row.name === BODY_PX.name) {
      seen.add(row.name);
      try { saved.bodyPx = cleanBodyPx(row.prompt_text); } catch { /* a damaged row is ignored */ }
      continue;
    }
    if (row.name === HEADING_EM.name) {
      seen.add(row.name);
      try { saved.headingEm = cleanHeadingEm(row.prompt_text); } catch { /* a damaged row is ignored */ }
      continue;
    }
    for (const id of DEVICE_IDS) {
      const isBody = row.name === deviceRowName(BODY_PX.name, id);
      const isHeading = row.name === deviceRowName(HEADING_EM.name, id);
      if (!isBody && !isHeading) continue;
      seen.add(row.name);
      const sizes = (saved.devices ??= {});
      const entry = (sizes[id] ??= { bodyPx: null, headingEm: null });
      try {
        if (isBody) entry.bodyPx = cleanBodyPx(row.prompt_text);
        else entry.headingEm = cleanHeadingEm(row.prompt_text);
      } catch { /* a damaged row is ignored */ }
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

/**
 * Save the sizes (null clears one). With `devices` every kind of screen has its own two sizes and the sizes for every screen are cleared
 * (the boxes already show what applies, so nothing is left behind that the editor cannot see); without it, only the two sizes for every
 * screen are saved, as before. Throws TypographyInputError for a number outside the limits (nothing is saved then).
 */
export async function saveReaderTypography(input: { bodyPx?: unknown; headingEm?: unknown; devices?: unknown }): Promise<ReaderTypography> {
  if (input.devices !== undefined && input.devices !== null) return saveDeviceTypography(input.devices);
  const bodyPx = cleanBodyPx(input.bodyPx);
  const headingEm = cleanHeadingEm(input.headingEm);
  await saveOne(BODY_PX.name, bodyPx);
  await saveOne(HEADING_EM.name, headingEm);
  return { bodyPx, headingEm };
}

/** The sizes of every kind of screen, checked in full before anything is written. Only a row whose value changed is written. */
export function cleanDeviceSizes(raw: unknown): Record<DeviceId, DeviceSizes> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypographyInputError("Permintaan tidak sah.");
  const given = raw as Record<string, unknown>;
  const result = {} as Record<DeviceId, DeviceSizes>;
  for (const id of DEVICE_IDS) {
    const entry = given[id] && typeof given[id] === "object" && !Array.isArray(given[id]) ? (given[id] as Record<string, unknown>) : {};
    const label = deviceInfo(id).label;
    try {
      result[id] = { bodyPx: cleanBodyPx(entry.bodyPx), headingEm: cleanHeadingEm(entry.headingEm) };
    } catch (error) {
      if (error instanceof TypographyInputError) throw new TypographyInputError(`${label}: ${error.message}`);
      throw error;
    }
  }
  return result;
}

async function saveDeviceTypography(raw: unknown): Promise<ReaderTypography> {
  const devices = cleanDeviceSizes(raw);
  const current = await listSavedTypography();
  for (const id of DEVICE_IDS) {
    if ((current.devices?.[id]?.bodyPx ?? null) !== devices[id].bodyPx) await saveOne(deviceRowName(BODY_PX.name, id), devices[id].bodyPx);
    if ((current.devices?.[id]?.headingEm ?? null) !== devices[id].headingEm) await saveOne(deviceRowName(HEADING_EM.name, id), devices[id].headingEm);
  }
  if (current.bodyPx !== null) await saveOne(BODY_PX.name, null);
  if (current.headingEm !== null) await saveOne(HEADING_EM.name, null);
  return { bodyPx: null, headingEm: null, devices };
}
