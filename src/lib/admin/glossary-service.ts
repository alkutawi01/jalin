/**
 * Admin Glossary Service
 *
 * Database operations for managing work glossary terms in admin console.
 */

import { Kysely, sql } from "kysely";
import { findDuplicateTerm } from "./metadata-rules";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

/** The work's glossary already has this term. */
export class DuplicateTermError extends Error {}

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
  /** How to say the term, the term in its own script and that language. Optional; "" clears one. Columns exist from migration 023. */
  pronunciation?: string;
  originalText?: string;
  originalLanguage?: string;
}

export interface GlossaryRecord {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
  pronunciation?: string | null;
  original_text?: string | null;
  original_language?: string | null;
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

  // Two requests at the same moment (a double click on "Simpan") each saw no such term and both wrote it: readers then met the
  // same glossary entry twice. Looking for the term and writing it happen one request at a time for a work.
  const result = await db.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"glossary:" + input.workId}))`.execute(trx);
    const existing = await trx.selectFrom("glossary_terms").where("work_id", "=", input.workId).select(["id", "term"]).execute();
    const duplicate = findDuplicateTerm(existing, input.term);
    if (duplicate) throw new DuplicateTermError(`Istilah "${duplicate.term}" sudah ada dalam glosari karya ini. Ubah yang sedia ada.`);
    return trx
    .insertInto("glossary_terms")
    .values({
      work_id: input.workId,
      term: input.term,
      meaning: input.meaning,
      source: input.source,
      sort_order: input.sortOrder,
      // Left out when empty, so a database without migration 023 still accepts the term.
      ...(input.pronunciation?.trim() ? { pronunciation: input.pronunciation.trim() } : {}),
      ...(input.originalText?.trim() ? { original_text: input.originalText.trim() } : {}),
      ...(input.originalLanguage?.trim() ? { original_language: input.originalLanguage.trim() } : {}),
      created_at: new Date().toISOString(),
    })
    .returning("id")
    .executeTakeFirst();
  });

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
  if (input.pronunciation !== undefined) updateData.pronunciation = input.pronunciation.trim() || null;
  if (input.originalText !== undefined) updateData.original_text = input.originalText.trim() || null;
  if (input.originalLanguage !== undefined) updateData.original_language = input.originalLanguage.trim() || null;

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
