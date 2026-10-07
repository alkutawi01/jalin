/**
 * Admin Reading Section Service
 *
 * Manages internal Novela sections (reading_sections).
 * Sections are structural units of ONE Work — never separate Works.
 * Reorder uses exact-set validation (same pattern as credits).
 */

import { Kysely, Transaction, sql } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("Pangkalan data tidak tersedia.");
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
    throw new Error("Karya tidak ditemui.");
  }
  if (String(work.type) !== "novela") {
    throw new Error("Bab hanya untuk karya jenis Novela.");
  }
  return work;
}

function validateSectionPayload(input: Partial<SectionInput>) {
  if (input.slug !== undefined) {
    if (!input.slug || !SLUG_RE.test(input.slug)) {
      throw new Error(
        `Slug bab "${input.slug}" tidak sah (huruf kecil, nombor, tanda hubung sahaja).`
      );
    }
  }
  if (input.body !== undefined && (!input.body || !input.body.trim())) {
    throw new Error("Body bab tidak boleh kosong.");
  }
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 1)) {
    throw new Error("Posisi bab mesti integer >= 1.");
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
    throw new Error("Body bab tidak boleh kosong.");
  }

  await assertNovelaWork(db, input.workId);

  // Two chapters added at the same moment both read the same last position, and the second was answered with the database's own
  // words ('duplicate key value violates unique constraint "reading_sections_work_position_key"'); so was a chapter whose address
  // another chapter already has. One chapter is added to a work at a time, and a clash is told in the editor's language.
  let result: { id: number } | undefined;
  try {
    result = await db.transaction().execute(async (trx) => {
      await sql`SELECT pg_advisory_xact_lock(hashtext(${"sections:" + input.workId}))`.execute(trx);
      const existing = await trx
        .selectFrom("reading_sections")
        .where("work_id", "=", input.workId)
        .select("position")
        .orderBy("position", "desc")
        .executeTakeFirst();
      const nextPosition = input.position ?? (existing ? existing.position + 1 : 1);

      // Validate position availability when explicit
      if (input.position !== undefined) {
        const clash = await trx
          .selectFrom("reading_sections")
          .where("work_id", "=", input.workId)
          .where("position", "=", nextPosition)
          .select("id")
          .executeTakeFirst();
        if (clash) {
          throw new Error(`Kedudukan ${nextPosition} sudah digunakan.`);
        }
      }

      const now = new Date().toISOString();
      return trx
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
    });
  } catch (error) {
    const clash = error as { code?: string; constraint?: string };
    if (clash.code === "23505") {
      throw new Error(
        clash.constraint === "reading_sections_work_position_key"
          ? "Kedudukan bab ini sudah digunakan. Muat semula senarai bab dan cuba lagi."
          : "Alamat bab ini sudah digunakan oleh bab lain dalam karya yang sama. Pilih alamat lain."
      );
    }
    throw error;
  }

  if (!result) {
    throw new Error("Gagal mencipta bab.");
  }

  const section = await getSection(result.id);
  if (!section) {
    throw new Error("Bab tidak ditemui selepas penciptaan.");
  }
  return section;
}

/**
 * The chapter addresses readers can use right now: those in the version of the work that is published. A chapter's address is
 * /kategori/novela/[work]/[chapter], so one of these cannot change or disappear without the link readers hold turning into a 404 at the next
 * "Terbitkan semula".
 */
export async function publicChapterSlugs(
  db: { selectFrom: (table: never) => any },
  workId: string
): Promise<Set<string>> {
  const work = await db.selectFrom("works" as never).where("id" as never, "=", workId as never).select(["published_revision_id"] as never).executeTakeFirst();
  const revisionId = (work as { published_revision_id?: string | null } | undefined)?.published_revision_id;
  if (!revisionId) return new Set();
  const revision = await db.selectFrom("work_revisions" as never).where("id" as never, "=", revisionId as never).select(["snapshot"] as never).executeTakeFirst();
  const raw = (revision as { snapshot?: unknown } | undefined)?.snapshot;
  const snapshot = (typeof raw === "string" ? JSON.parse(raw) : raw) as { sections?: Array<{ slug?: unknown }> } | null | undefined;
  return new Set((snapshot?.sections ?? []).map((section) => String(section.slug ?? "")).filter(Boolean));
}

export async function updateSection(
  id: number,
  input: Partial<SectionInput>
): Promise<SectionRecord> {
  const db = getAdminDb();
  validateSectionPayload(input);

  const existing = await getSection(id);
  if (!existing) {
    throw new Error("Bab tidak ditemui.");
  }
  await assertNovelaWork(db, existing.work_id);

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.title !== undefined) updateData.title = input.title || null;
  if (input.body !== undefined) updateData.body = input.body;
  if (input.readingMinutes !== undefined) updateData.reading_minutes = input.readingMinutes ?? null;
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 1)) {
    throw new Error("Kedudukan bab tidak sah: nombor bulat bermula 1.");
  }
  const renamed = input.slug !== undefined && input.slug !== existing.slug;
  if (renamed && (await publicChapterSlugs(db as never, existing.work_id)).has(existing.slug)) {
    throw new Error("Alamat bab yang sudah awam tidak boleh ditukar: pautan bab yang sudah dikongsi akan terputus selepas Terbitkan semula. Tajuk dan isi bab boleh disunting.");
  }
  const moved = input.position !== undefined && input.position !== existing.position;

  // One transaction: a request that fails (a slug another chapter already has) changes nothing, not even the chapter's position.
  try {
    await db.transaction().execute(async (trx) => {
      if (moved) {
        // The new order: this chapter placed at the asked position among the others, then every position renumbered 1..N
        // (parked above the real positions first, so the unique position never clashes on the way).
        const rows = await trx.selectFrom("reading_sections").where("work_id", "=", existing.work_id).select("id").orderBy("position", "asc").execute();
        const others = rows.map((r) => r.id).filter((x) => x !== id);
        const index = Math.min(Math.max(input.position! - 1, 0), others.length);
        const order = [...others.slice(0, index), id, ...others.slice(index)];
        for (let i = 0; i < order.length; i++) {
          await trx.updateTable("reading_sections").where("id", "=", order[i]!).set({ position: 1000001 + i }).execute();
        }
        for (let i = 0; i < order.length; i++) {
          await trx.updateTable("reading_sections").where("id", "=", order[i]!).set({ position: i + 1, updated_at: new Date().toISOString() }).execute();
        }
      }

      await trx.updateTable("reading_sections").where("id", "=", id).set(updateData).execute();

      if (renamed) {
        // The chapter's images are tied to its slug, so they follow it when the slug changes.
        await sql`SAVEPOINT chapter_images`.execute(trx);
        try {
          await trx
            .updateTable("visuals")
            .where("work_id", "=", existing.work_id)
            .where("section_slug" as never, "=", existing.slug as never)
            .set({ section_slug: input.slug } as never)
            .execute();
          await sql`RELEASE SAVEPOINT chapter_images`.execute(trx);
        } catch {
          // Migration 022 not applied yet: there are no chapter images to move.
          await sql`ROLLBACK TO SAVEPOINT chapter_images`.execute(trx);
        }
        // A character remembers the chapter where they first appear by its slug; without this the reader would not find that chapter
        // and would show the character from chapter 1 (before they appear in the story).
        const work = await trx.selectFrom("works").where("id", "=", existing.work_id).select("metadata").forUpdate().executeTakeFirst();
        const metadata = (work?.metadata ?? null) as { characters?: Array<Record<string, unknown>> } | null;
        if (metadata && Array.isArray(metadata.characters) && metadata.characters.some((c) => c.firstAppearanceSection === existing.slug)) {
          const characters = metadata.characters.map((c) => (c.firstAppearanceSection === existing.slug ? { ...c, firstAppearanceSection: input.slug } : c));
          await trx.updateTable("works").where("id", "=", existing.work_id).set({ metadata: JSON.stringify({ ...metadata, characters }) }).execute();
        }
      }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("Alamat bab ini sudah digunakan oleh bab lain dalam karya yang sama. Pilih alamat lain.");
    }
    throw error;
  }

  const section = await getSection(id);
  if (!section) {
    throw new Error("Bab tidak ditemui selepas kemas kini.");
  }
  return section;
}

export async function deleteSection(id: number, options: { confirmPublic?: boolean } = {}): Promise<void> {
  const db = getAdminDb();
  const existing = await getSection(id);
  if (!existing) {
    throw new Error("Bab tidak ditemui.");
  }
  if (options.confirmPublic !== true && (await publicChapterSlugs(db as never, existing.work_id)).has(existing.slug)) {
    throw new Error("Bab ini sedang dibaca pembaca: selepas Terbitkan semula, pautannya menjadi 404. Perlu disahkan.");
  }

  await db.transaction().execute(async (trx) => {
    // A character remembers the chapter where they first appear by its slug. Deleting that chapter would leave the reference pointing at
    // nothing (and the character form itself rejects such a reference), so the editor is told which characters to move first.
    // Checked under the same lock on the work that saving characters takes.
    const work = await trx.selectFrom("works").where("id", "=", existing.work_id).select("metadata").forUpdate().executeTakeFirst();
    const characters = ((work?.metadata ?? null) as { characters?: Array<Record<string, unknown>> } | null)?.characters;
    const using = Array.isArray(characters) ? characters.filter((c) => c.firstAppearanceSection === existing.slug).map((c) => String(c.name ?? "")) : [];
    if (using.length > 0) {
      throw new Error(`Bab ini masih dirujuk sebagai kemunculan pertama watak: ${using.join(", ")}. Pindahkan atau kosongkan kemunculan pertama watak itu dahulu (tab Watak), kemudian padam bab.`);
    }
    await trx.deleteFrom("reading_sections").where("id", "=", id).execute();
    // Images that belonged to this chapter go with it (a failed delete must not abort the chapter delete).
    await sql`SAVEPOINT chapter_images`.execute(trx);
    try {
      await trx.deleteFrom("visuals").where("work_id", "=", existing.work_id).where("section_slug" as never, "=", existing.slug as never).execute();
      await sql`RELEASE SAVEPOINT chapter_images`.execute(trx);
    } catch {
      // Migration 022 not applied yet: there are no chapter images.
      await sql`ROLLBACK TO SAVEPOINT chapter_images`.execute(trx);
    }
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
      `Jangkaan ${existingIds.length} ID bab, terima ${submittedIds.length}.`
    );
  }
  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] !== submittedIds[i]) {
      throw new Error(
        `ID bab tidak sepadan: jangkaan ${existingIds[i]}, terima ${submittedIds[i]}.`
      );
    }
  }
  const unique = new Set(sectionIds);
  if (unique.size !== sectionIds.length) {
    throw new Error("Bab yang sama berulang dalam susunan baharu.");
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
