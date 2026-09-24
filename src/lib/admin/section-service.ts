/**
 * Admin Reading Section Service
 *
 * Manages internal Novela sections (reading_sections).
 * Sections are structural units of ONE Work — never separate Works.
 * Reorder uses exact-set validation (same pattern as credits).
 */

import { Kysely, Transaction } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[SectionService] Database not available.");
  }
  return getDb();
}

export interface SectionInput {
  workId: string;
  slug: string;
  title?: string | null;
  position?: number;
  body: string;
  readingMinutes?: number | null;
}

export interface SectionRecord {
  id: number;
  work_id: string;
  slug: string;
  title: string | null;
  position: number;
  body: string;
  reading_minutes: number | null;
  created_at: Date;
  updated_at: Date;
}

async function assertNovelaWork(db: Kysely<Database> | Transaction<Database>, workId: string) {
  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .select(["id", "type"])
    .executeTakeFirst();
  if (!work) {
    throw new Error("Work tidak ditemui.");
  }
  if (String(work.type) !== "novela") {
    throw new Error("Reading section hanya untuk Work type=novela.");
  }
  return work;
}

function validateSectionPayload(input: Partial<SectionInput>) {
  if (input.slug !== undefined) {
    if (!input.slug || !SLUG_RE.test(input.slug)) {
      throw new Error(
        `Slug bahagian "${input.slug}" tidak sah (huruf kecil, nombor, tanda hubung sahaja).`
      );
    }
  }
  if (input.body !== undefined && (!input.body || !input.body.trim())) {
    throw new Error("Body bahagian tidak boleh kosong.");
  }
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 1)) {
    throw new Error("Position bahagian mesti integer >= 1.");
  }
}

export async function listSectionsForWork(workId: string): Promise<SectionRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("reading_sections")
    .where("work_id", "=", workId)
    .orderBy("position", "asc")
    .selectAll()
    .execute();
}

export async function getSection(id: number): Promise<SectionRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("reading_sections")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createSection(input: SectionInput): Promise<SectionRecord> {
  const db = getAdminDb();
  validateSectionPayload(input);
  if (!input.body || !input.body.trim()) {
    throw new Error("Body bahagian tidak boleh kosong.");
  }

  await assertNovelaWork(db, input.workId);

  const existing = await db
    .selectFrom("reading_sections")
    .where("work_id", "=", input.workId)
    .select("position")
    .orderBy("position", "desc")
    .executeTakeFirst();
  const nextPosition = input.position ?? (existing ? existing.position + 1 : 1);

  // Validate position availability when explicit
  if (input.position !== undefined) {
    const clash = await db
      .selectFrom("reading_sections")
      .where("work_id", "=", input.workId)
      .where("position", "=", nextPosition)
      .select("id")
      .executeTakeFirst();
    if (clash) {
      throw new Error(`Position ${nextPosition} sudah digunakan.`);
    }
  }

  const now = new Date().toISOString();
  const result = await db
    .insertInto("reading_sections")
    .values({
      work_id: input.workId,
      slug: input.slug,
      title: input.title ?? null,
      position: nextPosition,
      body: input.body,
      reading_minutes: input.readingMinutes ?? null,
      created_at: now,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta bahagian.");
  }

  const section = await getSection(result.id);
  if (!section) {
    throw new Error("Bahagian tidak ditemui selepas penciptaan.");
  }
  return section;
}

export async function updateSection(
  id: number,
  input: Partial<SectionInput>
): Promise<SectionRecord> {
  const db = getAdminDb();
  validateSectionPayload(input);

  const existing = await getSection(id);
  if (!existing) {
    throw new Error("Bahagian tidak ditemui.");
  }
  await assertNovelaWork(db, existing.work_id);

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.title !== undefined) updateData.title = input.title || null;
  if (input.body !== undefined) updateData.body = input.body;
  if (input.readingMinutes !== undefined) updateData.reading_minutes = input.readingMinutes ?? null;
  if (input.position !== undefined && input.position !== existing.position) {
    // Position change: two-phase via temporary negative to avoid unique violation.
    const target = input.position;
    await db.transaction().execute(async (trx) => {
      // Park far above real positions first (CHECK position >= 1 forbids negatives).
      await trx
        .updateTable("reading_sections")
        .where("id", "=", id)
        .set({ position: 1000001, updated_at: new Date().toISOString() })
        .execute();
      const others = await trx
        .selectFrom("reading_sections")
        .where("work_id", "=", existing.work_id)
        .where("position", ">=", target)
        .where("id", "!=", id)
        .select(["id", "position"])
        .orderBy("position", "asc")
        .execute();
      for (const row of others) {
        await trx
          .updateTable("reading_sections")
          .where("id", "=", row.id)
          .set({ position: 2000000 + row.position, updated_at: new Date().toISOString() })
          .execute();
      }
      for (const row of others) {
        await trx
          .updateTable("reading_sections")
          .where("id", "=", row.id)
          .set({ position: row.position + 1, updated_at: new Date().toISOString() })
          .execute();
      }
      await trx
        .updateTable("reading_sections")
        .where("id", "=", id)
        .set({ position: target, updated_at: new Date().toISOString() })
        .execute();
    });
    delete updateData.position;
  }

  await db
    .updateTable("reading_sections")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const section = await getSection(id);
  if (!section) {
    throw new Error("Bahagian tidak ditemui selepas kemas kini.");
  }
  return section;
}

export async function deleteSection(id: number): Promise<void> {
  const db = getAdminDb();
  const existing = await getSection(id);
  if (!existing) {
    throw new Error("Bahagian tidak ditemui.");
  }

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("reading_sections").where("id", "=", id).execute();
    // Close the gap: renumber remaining positions contiguously 1..N.
    const remaining = await trx
      .selectFrom("reading_sections")
      .where("work_id", "=", existing.work_id)
      .select("id")
      .orderBy("position", "asc")
      .execute();
    for (let i = 0; i < remaining.length; i++) {
      await trx
        .updateTable("reading_sections")
        .where("id", "=", remaining[i]!.id)
        .set({ position: i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
  });
}

/**
 * Exact-set reorder: submitted IDs must equal all section IDs for the Work.
 * Atomic; normalizes positions to contiguous 1..N.
 */
export async function reorderSections(
  workId: string,
  sectionIds: number[]
): Promise<SectionRecord[]> {
  const db = getAdminDb();
  await assertNovelaWork(db, workId);

  const existing = await db
    .selectFrom("reading_sections")
    .where("work_id", "=", workId)
    .select("id")
    .execute();
  const existingIds = existing.map((s) => s.id).sort((a, b) => a - b);
  const submittedIds = [...sectionIds].sort((a, b) => a - b);

  if (existingIds.length !== submittedIds.length) {
    throw new Error(
      `Jangkaan ${existingIds.length} ID bahagian, terima ${submittedIds.length}.`
    );
  }
  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] !== submittedIds[i]) {
      throw new Error(
        `ID bahagian tidak sepadan: jangkaan ${existingIds[i]}, terima ${submittedIds[i]}.`
      );
    }
  }
  const unique = new Set(sectionIds);
  if (unique.size !== sectionIds.length) {
    throw new Error("ID bahagian berulang dalam permintaan reorder.");
  }

  await db.transaction().execute(async (trx) => {
    // Two-phase: park all at high positions (CHECK position >= 1), then assign 1..N.
    for (let i = 0; i < sectionIds.length; i++) {
      await trx
        .updateTable("reading_sections")
        .where("id", "=", sectionIds[i]!)
        .where("work_id", "=", workId)
        .set({ position: 1000000 + i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
    for (let i = 0; i < sectionIds.length; i++) {
      await trx
        .updateTable("reading_sections")
        .where("id", "=", sectionIds[i]!)
        .where("work_id", "=", workId)
        .set({ position: i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
  });

  return listSectionsForWork(workId);
}
