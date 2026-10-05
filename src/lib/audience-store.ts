/**
 * Server side of the audience bands: where the editor's list is kept (`prompt_templates`, scope "audience_bands"). Kept apart from
 * audience.ts so that file stays free of the database and can be used in the editor's pages.
 */

import { getDb, hasDb } from "./db";
import { DEFAULT_AUDIENCE_BANDS, validateBands, type AudienceBand } from "./audience";

const SCOPE = "audience_bands";
const NAME = "bands";

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
