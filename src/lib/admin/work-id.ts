/**
 * Work ID Generator — canonical JLN-{TYPE}-{NNNN} format.
 *
 * Examples: JLN-CER-0001, JLN-NOV-0001, JLN-BER-0003
 *
 * Generates sequentially against existing production data.
 * Handles slug collision explicitly — no silent random suffixes.
 */

import type { Kysely } from "kysely";
import type { Database, WorkType } from "../db/types";

const TYPE_PREFIX: Record<WorkType, string> = {
  cerpen: "CER",
  novela: "NOV",
  bersiri: "BER",
  terjemahan: "TER",
  fragmen: "FRA",
  sinopsis: "SIN",
};

/**
 * Generate the next Work ID for a given type.
 * Queries existing Works to find the highest sequential number.
 */
export async function generateWorkId(
  db: Kysely<Database>,
  workType: WorkType
): Promise<string> {
  const prefix = TYPE_PREFIX[workType];
  if (!prefix) {
    throw new Error(`Unknown work type: ${workType}`);
  }

  // Find all existing IDs with this prefix
  const existing = await db
    .selectFrom("works")
    .where("id", "like", `JLN-${prefix}-%`)
    .select("id")
    .execute();

  // Extract the numeric parts and find the max
  let maxNum = 0;
  for (const row of existing) {
    const match = row.id.match(/JLN-[A-Z]+-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `JLN-${prefix}-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Check if a Work ID already exists.
 */
export async function workIdExists(
  db: Kysely<Database>,
  workId: string
): Promise<boolean> {
  const result = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .select("id")
    .executeTakeFirst();

  return !!result;
}

/**
 * Check if a slug already exists.
 */
export async function slugExists(
  db: Kysely<Database>,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = db
    .selectFrom("works")
    .where("slug", "=", slug)
    .select("id");

  if (excludeId) {
    query = query.where("id", "!=", excludeId);
  }

  const result = await query.executeTakeFirst();
  return !!result;
}
