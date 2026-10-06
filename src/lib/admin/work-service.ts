/**
 * Admin Work Service
 *
 * Database operations for managing works in admin console.
 * Separated from public content repository.
 */

import { Kysely } from "kysely";
import { capitaliseFirst } from "../capitalise-first";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import type { WorkType, WorkStatus } from "../db/types";
import { characterProblems } from "./metadata-rules";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[AdminWorkService] Database not available.");
  }
  return getDb();
}

export interface WorkInput {
  title: string;
  slug: string;
  type: WorkType;
  status: WorkStatus;
  body: string;
  genre?: string;
  audience?: string;
  dek?: string;
  readingMinutes?: number;
  version?: string;
  publishedAt?: string;
  updatedAt?: string;
  editorPick?: boolean;
  editorPickRank?: number | null;
  editorPickReason?: string | null;
  /** Editor's note shown at the end of the work; empty removes it. Stored in works.metadata. */
  editorNote?: string;
  /** The note under "Tentang karya" in the reader's side card; empty removes it. Stored in works.reader. */
  readerNote?: string;
  /** Cerpen/Novela: "sumber" when taken from another source, "asli" (or empty) for Jalin's own. Stored in works.metadata. */
  origin?: string;
}

export interface WorkRecord {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  body: string | null;
  reading_minutes: number | null;
  version: string;
  version_label: string | null;
  revision_count: number;
  editorial_history: unknown;
  editor_pick: boolean | null;
  editor_pick_rank: number | null;
  editor_pick_reason: string | null;
  published_at: Date | null;
  published_by: string | null;
  published_revision_id: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: Date;
  created_at: Date;
}

/**
 * List all works from database.
 */
/** Just what a list needs for the given works, in one query. */
export async function listWorksByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const db = getAdminDb();
  return db
    .selectFrom("works")
    .where("id", "in", ids)
    .select(["id", "slug", "title", "type", "status"])
    .execute();
}

export async function listWorks(): Promise<WorkRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("works")
    .selectAll()
    .orderBy("updated_at", "desc")
    .execute();
}

/**
 * Get a single work by ID.
 */
export async function getWork(id: string): Promise<WorkRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("works")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Get a single work by slug.
 */
export async function getWorkBySlug(slug: string): Promise<WorkRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("works")
    .where("slug", "=", slug)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Check if slug already exists.
 */
export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const db = getAdminDb();
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

/**
 * Create a new work.
 */
export async function createWork(input: WorkInput): Promise<WorkRecord> {
  const db = getAdminDb();

  // Check slug uniqueness
  if (await slugExists(input.slug)) {
    throw new Error(`Slug "${input.slug}" already exists.`);
  }

  const now = new Date().toISOString();
  const id = `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const editorialHistory = [
    {
      version: input.version || "v1.0",
      type: "initial",
      summary: "Draf awal",
      date: now,
    },
  ];

  await db
    .insertInto("works")
    .values({
      id,
      slug: input.slug,
      title: input.title,
      type: input.type,
      status: input.status || "draft",
      body: input.body || "",
      genre: input.genre || null,
      audience: input.audience || null,
      dek: input.dek || null,
      reading_minutes: input.readingMinutes || null,
      version: input.version || "v1.0",
      version_label: null,
      revision_count: 0,
      editorial_history: JSON.stringify(editorialHistory),
      published_at: input.publishedAt || null,
      published_by: null,
      first_published_at: input.publishedAt || null,
      published_revision_id: null,
      updated_at: now,
      created_at: now,
    })
    .execute();

  const work = await getWork(id);
  if (!work) {
    throw new Error("Failed to create work.");
  }

  return work;
}

/**
 * Update an existing work.
 */
export async function updateWork(
  id: string,
  input: Partial<WorkInput>
): Promise<WorkRecord> {
  const db = getAdminDb();

  // Check slug uniqueness if slug is being changed
  if (input.slug) {
    if (await slugExists(input.slug, id)) {
      throw new Error(`Slug "${input.slug}" already exists.`);
    }
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.body !== undefined) updateData.body = input.body;
  if (input.genre !== undefined) updateData.genre = input.genre || null;
  if (input.audience !== undefined) updateData.audience = input.audience || null;
  if (input.dek !== undefined) updateData.dek = input.dek || null;
  if (input.readingMinutes !== undefined) updateData.reading_minutes = input.readingMinutes || null;
  if (input.version !== undefined) updateData.version = input.version;
  if (input.publishedAt !== undefined) updateData.published_at = input.publishedAt || null;
  if (input.editorPick !== undefined) updateData.editor_pick = Boolean(input.editorPick);
  if (input.editorPickRank !== undefined) {
    updateData.editor_pick_rank =
      input.editorPickRank === null ? null : Number(input.editorPickRank) || null;
  }
  if (input.editorPickReason !== undefined) {
    updateData.editor_pick_reason = input.editorPickReason ? String(input.editorPickReason) : null;
  }

  if (input.readerNote !== undefined) {
    const note = String(input.readerNote ?? "").trim();
    updateData.reader = note ? { note } : null;
  }

  if (input.editorNote !== undefined || input.origin !== undefined) {
    // Read-modify-write under a row lock, so a character save at the same moment cannot be overwritten.
    await db.transaction().execute(async (trx) => {
      const current = await trx.selectFrom("works").where("id", "=", id).select("metadata").forUpdate().executeTakeFirst();
      const metadata: Record<string, unknown> = { ...((current?.metadata ?? {}) as Record<string, unknown>) };
      if (input.editorNote !== undefined) {
        const note = String(input.editorNote ?? "").trim();
        if (note) metadata.editorNote = note;
        else delete metadata.editorNote;
      }
      if (input.origin !== undefined) {
        if (input.origin === "sumber") metadata.origin = "sumber";
        else delete metadata.origin;
      }
      await trx.updateTable("works").where("id", "=", id).set({ ...updateData, metadata }).execute();
    });
  } else {
    await db
      .updateTable("works")
      .where("id", "=", id)
      .set(updateData)
      .execute();
  }

  const work = await getWork(id);
  if (!work) {
    throw new Error("Work not found after update.");
  }

  return work;
}

/**
 * Archive a work (soft delete).
 */
export async function archiveWork(id: string): Promise<WorkRecord> {
  return updateWork(id, { status: "archived" });
}

/**
 * Permanently delete a work that was never published (a test draft, a mistake). A work that has ever been public keeps
 * its history and can only be archived. Credits, glossary and pictures have no cascade in the database, so they go first.
 */
export async function deleteUnpublishedWork(id: string): Promise<void> {
  const db = getAdminDb();
  await db.transaction().execute(async (trx) => {
    const work = await trx.selectFrom("works").where("id", "=", id).select(["status", "published_at", "published_revision_id"]).forUpdate().executeTakeFirst();
    if (!work) throw new Error("Karya tidak ditemui.");
    if (work.status === "published" || work.published_at || work.published_revision_id) {
      throw new Error("Karya yang pernah diterbitkan tidak boleh dipadam, hanya diarkibkan.");
    }
    await trx.deleteFrom("visual_requests").where("work_id", "=", id).execute();
    await trx.deleteFrom("visuals").where("work_id", "=", id).execute();
    await trx.deleteFrom("credits").where("work_id", "=", id).execute();
    await trx.deleteFrom("glossary_terms").where("work_id", "=", id).execute();
    await trx.deleteFrom("works").where("id", "=", id).execute();
  });
}

/**
 * Character metadata (Content Model Readiness audit,
 * docs/JALIN_CONTENT_MODEL_READINESS_AUDIT.md).
 *
 * Deliberately minimal, per director instruction: name, role and an
 * optional novela section reference only. No age/appearance/
 * relationship/secret fields — those carry real spoiler risk and
 * were explicitly excluded from this phase.
 *
 * Stored inside the existing works.metadata jsonb column (added by
 * migration 018, previously write-only-via-SQL) under the
 * "characters" key. No schema change: this is the first admin write
 * path into that column, not a new column.
 */
export interface CharacterEntry {
  name: string;
  role: string;
  /** Novela section slug (ReadingSection.slug) this character first
   *  appears in. Optional/nullable for cerpen, fragmen, sinopsis and
   *  bersiri, where progressive disclosure doesn't apply. Recorded
   *  now; not yet consumed by the reader (see
   *  docs/NOVELA_PROGRESSIVE_DISCLOSURE.md) — that filtering is
   *  separate, unbuilt work. */
  firstAppearanceSection?: string | null;
}

function validateCharacterEntries(characters: unknown): CharacterEntry[] {
  if (!Array.isArray(characters)) {
    throw new Error("characters mesti senarai (array).");
  }

  return characters.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Watak #${index + 1}: bentuk tidak sah.`);
    }
    const name = "name" in entry ? String((entry as { name: unknown }).name ?? "").trim() : "";
    const role = "role" in entry ? String((entry as { role: unknown }).role ?? "").trim() : "";
    if (!name) throw new Error(`Watak #${index + 1}: nama diperlukan.`);
    if (!role) throw new Error(`Watak #${index + 1}: peranan diperlukan.`);

    const rawSection =
      "firstAppearanceSection" in entry
        ? (entry as { firstAppearanceSection: unknown }).firstAppearanceSection
        : undefined;
    const firstAppearanceSection =
      rawSection === undefined || rawSection === null || rawSection === ""
        ? null
        : String(rawSection).trim();

    return { name, role: capitaliseFirst(role), firstAppearanceSection };
  });
}

export const PLACES_MAX = 12;
export const PLACE_NAME_MAX = 80;
export const PLACE_DESCRIPTION_MAX = 160;

/** The places (Latar tempat) of a story: a name and, optionally, a few words about it. */
export function validatePlaceEntries(places: unknown): Array<{ name: string; description?: string }> {
  if (!Array.isArray(places)) throw new Error("places mesti senarai (array).");
  if (places.length > PLACES_MAX) throw new Error(`Latar tempat: paling banyak ${PLACES_MAX}.`);
  const seen = new Set<string>();
  return places.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Latar tempat #${index + 1}: bentuk tidak sah.`);
    const name = String((entry as { name?: unknown }).name ?? "").trim();
    const description = String((entry as { description?: unknown }).description ?? "").trim();
    if (!name) throw new Error(`Latar tempat #${index + 1}: nama diperlukan.`);
    if (name.length > PLACE_NAME_MAX) throw new Error(`Latar tempat #${index + 1}: nama terlalu panjang (maksimum ${PLACE_NAME_MAX} aksara).`);
    if (description.length > PLACE_DESCRIPTION_MAX) throw new Error(`Latar tempat #${index + 1}: keterangan terlalu panjang (maksimum ${PLACE_DESCRIPTION_MAX} aksara).`);
    const key = name.toLocaleLowerCase("ms");
    if (seen.has(key)) throw new Error(`Latar tempat "${name}" disenaraikan dua kali.`);
    seen.add(key);
    return description ? { name, description: capitaliseFirst(description) } : { name };
  });
}

/** Replace the places stored in works.metadata.places (the other metadata keys are kept; same row lock as the characters). */
export async function updateWorkPlaces(id: string, places: unknown): Promise<WorkRecord> {
  const db = getAdminDb();
  const existing = await getWork(id);
  if (!existing) throw new Error("Work not found.");
  const validated = validatePlaceEntries(places);
  await db.transaction().execute(async (trx) => {
    const current = await trx.selectFrom("works").where("id", "=", id).select("metadata").forUpdate().executeTakeFirst();
    const metadata = { ...((current?.metadata ?? {}) as Record<string, unknown>), places: validated };
    await trx.updateTable("works").where("id", "=", id).set({ metadata, updated_at: new Date().toISOString() }).execute();
  });
  const work = await getWork(id);
  if (!work) throw new Error("Work not found after update.");
  return work;
}

/**
 * Replace the full character list stored in works.metadata.characters.
 * Read-modify-write on the metadata jsonb: other keys that may live in
 * `metadata` later (this phase adds none) are preserved untouched.
 */
export async function updateWorkCharacters(
  id: string,
  characters: unknown
): Promise<WorkRecord> {
  const db = getAdminDb();

  const existing = await getWork(id);
  if (!existing) {
    throw new Error("Work not found.");
  }

  const validated = validateCharacterEntries(characters);
  // Merge into the freshest metadata under a row lock (a note/origin save at the same moment must survive). The chapters are read and judged
  // AFTER taking the lock, in the same transaction: renaming or deleting a chapter takes the same lock, so a chapter cannot vanish between the
  // check and the write (which used to leave a character pointing at a chapter that no longer exists).
  await db.transaction().execute(async (trx) => {
    const current = await trx.selectFrom("works").where("id", "=", id).select("metadata").forUpdate().executeTakeFirst();
    const chapterSlugs = (await trx.selectFrom("reading_sections").where("work_id", "=", id).select("slug").execute()).map((row) => String(row.slug));
    const problems = characterProblems(validated, chapterSlugs);
    if (problems.length > 0) throw new Error(problems.join(" "));
    const metadata = { ...((current?.metadata ?? {}) as Record<string, unknown>), characters: validated };
    await trx.updateTable("works").where("id", "=", id).set({ metadata, updated_at: new Date().toISOString() }).execute();
  });

  const work = await getWork(id);
  if (!work) {
    throw new Error("Work not found after update.");
  }

  return work;
}
