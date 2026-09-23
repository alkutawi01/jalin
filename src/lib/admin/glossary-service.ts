/**
 * Admin Glossary Service
 *
 * Database operations for managing work glossary terms in admin console.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[GlossaryService] Database not available.");
  }
  return getDb();
}

export interface GlossaryInput {
  workId: string;
  term: string;
  meaning: string;
  source: string;
  sortOrder: number;
}

export interface GlossaryRecord {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
  created_at: Date;
}

/**
 * List all glossary terms for a work.
 */
export async function listGlossaryForWork(workId: string): Promise<GlossaryRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("glossary_terms")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

/**
 * Get a single glossary term by ID.
 */
export async function getGlossaryTerm(id: number): Promise<GlossaryRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("glossary_terms")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Create a new glossary term.
 */
export async function createGlossaryTerm(input: GlossaryInput): Promise<GlossaryRecord> {
  const db = getAdminDb();

  const result = await db
    .insertInto("glossary_terms")
    .values({
      work_id: input.workId,
      term: input.term,
      meaning: input.meaning,
      source: input.source,
      sort_order: input.sortOrder,
      created_at: new Date().toISOString(),
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Failed to create glossary term.");
  }

  const term = await getGlossaryTerm(result.id);
  if (!term) {
    throw new Error("Glossary term not found after creation.");
  }

  return term;
}

/**
 * Update an existing glossary term.
 */
export async function updateGlossaryTerm(
  id: number,
  input: Partial<GlossaryInput>
): Promise<GlossaryRecord> {
  const db = getAdminDb();

  const updateData: Record<string, unknown> = {};

  if (input.term !== undefined) updateData.term = input.term;
  if (input.meaning !== undefined) updateData.meaning = input.meaning;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  await db
    .updateTable("glossary_terms")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const term = await getGlossaryTerm(id);
  if (!term) {
    throw new Error("Glossary term not found after update.");
  }

  return term;
}

/**
 * Delete a glossary term.
 */
export async function deleteGlossaryTerm(id: number): Promise<void> {
  const db = getAdminDb();

  await db
    .deleteFrom("glossary_terms")
    .where("id", "=", id)
    .execute();
}
