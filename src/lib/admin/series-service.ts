/**
 * Admin Series Service
 *
 * Manages Series containers and episode membership/order for Bersiri.
 * Episode IS a Work (type=bersiri); series_entries only membership/order.
 * Reorder uses exact-set validation. No destructive cascade to Works.
 */

import { Kysely, Transaction } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_MODES = new Set(["continuous", "anthology"]);
const VALID_STATUSES = new Set(["ongoing", "completed"]);

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[SeriesService] Database not available.");
  }
  return getDb();
}

export interface SeriesInput {
  slug: string;
  title: string;
  dek?: string | null;
  genre?: string | null;
  audience?: string | null;
  mode?: string;
  status?: string;
}

export interface SeriesRecord {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  mode: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface SeriesEntryRecord {
  id: number;
  series_id: string;
  work_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

function validateSeriesPayload(input: Partial<SeriesInput>, requireAll = false) {
  if (requireAll || input.slug !== undefined) {
    if (!input.slug || !SLUG_RE.test(input.slug)) {
      throw new Error(
        `Slug Siri "${input.slug}" tidak sah (huruf kecil, nombor, tanda hubung sahaja).`
      );
    }
  }
  if (requireAll || input.title !== undefined) {
    if (!input.title || !input.title.trim()) {
      throw new Error("Tajuk Siri diperlukan.");
    }
  }
  if (input.mode !== undefined && !VALID_MODES.has(input.mode)) {
    throw new Error(`Mode Siri tidak sah: "${input.mode}".`);
  }
  if (input.status !== undefined && !VALID_STATUSES.has(input.status)) {
    throw new Error(`Status Siri tidak sah: "${input.status}".`);
  }
}

export async function listSeries(): Promise<SeriesRecord[]> {
  const db = getAdminDb();
  return db.selectFrom("series").selectAll().orderBy("title", "asc").execute();
}

export async function getSeries(id: string): Promise<SeriesRecord | undefined> {
  const db = getAdminDb();
  return db.selectFrom("series").where("id", "=", id).selectAll().executeTakeFirst();
}

export async function getSeriesBySlug(slug: string): Promise<SeriesRecord | undefined> {
  const db = getAdminDb();
  return db.selectFrom("series").where("slug", "=", slug).selectAll().executeTakeFirst();
}

export async function createSeries(input: SeriesInput): Promise<SeriesRecord> {
  const db = getAdminDb();
  validateSeriesPayload(input, true);

  const existing = await db
    .selectFrom("series")
    .where("slug", "=", input.slug)
    .select("id")
    .executeTakeFirst();
  if (existing) {
    throw new Error(`Slug Siri "${input.slug}" sudah wujud.`);
  }

  const now = new Date().toISOString();
  const id = `SER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await db
    .insertInto("series")
    .values({
      id,
      slug: input.slug,
      title: input.title.trim(),
      dek: input.dek ?? null,
      genre: input.genre ?? null,
      audience: input.audience ?? null,
      mode: input.mode || "continuous",
      status: input.status || "ongoing",
      created_at: now,
      updated_at: now,
    })
    .execute();

  const series = await getSeries(id);
  if (!series) {
    throw new Error("Siri tidak ditemui selepas penciptaan.");
  }
  return series;
}

export async function updateSeries(
  id: string,
  input: Partial<SeriesInput>
): Promise<SeriesRecord> {
  const db = getAdminDb();
  validateSeriesPayload(input);

  const existing = await getSeries(id);
  if (!existing) {
    throw new Error("Siri tidak ditemui.");
  }

  if (input.slug && input.slug !== existing.slug) {
    const clash = await db
      .selectFrom("series")
      .where("slug", "=", input.slug)
      .where("id", "!=", id)
      .select("id")
      .executeTakeFirst();
    if (clash) {
      throw new Error(`Slug Siri "${input.slug}" sudah wujud.`);
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.dek !== undefined) updateData.dek = input.dek || null;
  if (input.genre !== undefined) updateData.genre = input.genre || null;
  if (input.audience !== undefined) updateData.audience = input.audience || null;
  if (input.mode !== undefined) updateData.mode = input.mode;
  if (input.status !== undefined) updateData.status = input.status;

  await db.updateTable("series").where("id", "=", id).set(updateData).execute();

  const series = await getSeries(id);
  if (!series) {
    throw new Error("Siri tidak ditemui selepas kemas kini.");
  }
  return series;
}

/**
 * Safe delete: only allowed when no episode Works are attached (empty Series).
 * Never cascade-deletes Works. Reject if any membership exists.
 */
export async function deleteSeries(id: string): Promise<void> {
  const db = getAdminDb();
  const existing = await getSeries(id);
  if (!existing) {
    throw new Error("Siri tidak ditemui.");
  }

  const membership = await db
    .selectFrom("series_entries")
    .where("series_id", "=", id)
    .select("id")
    .executeTakeFirst();
  if (membership) {
    throw new Error(
      "Siri masih mempunyai episod. Keluarkan episod (dan pastikan tiada episod terbit) sebelum memadam Siri."
    );
  }

  // Safe: empty Series only; series_entries would cascade but there are none.
  await db.deleteFrom("series").where("id", "=", id).execute();
}

export async function listSeriesEntries(seriesId: string): Promise<SeriesEntryRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("series_entries")
    .where("series_id", "=", seriesId)
    .orderBy("position", "asc")
    .selectAll()
    .execute();
}

export async function getSeriesEntryForWork(workId: string): Promise<SeriesEntryRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("series_entries")
    .where("work_id", "=", workId)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Attach a Work (must type=bersiri) to a Series.
 * Prevents: non-bersiri type, duplicate membership, Work already in another Series.
 */
export async function attachEpisode(
  seriesId: string,
  workId: string,
  position?: number
): Promise<SeriesEntryRecord> {
  const db = getAdminDb();

  const series = await getSeries(seriesId);
  if (!series) {
    throw new Error("Siri tidak ditemui.");
  }

  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .select(["id", "type", "slug", "title"])
    .executeTakeFirst();
  if (!work) {
    throw new Error("Work tidak ditemui.");
  }
  if (String(work.type) !== "bersiri") {
    throw new Error(
      `Hanya Work type=bersiri boleh disertai Siri (sekarang: "${work.type}").`
    );
  }

  const existingMembership = await getSeriesEntryForWork(workId);
  if (existingMembership) {
    if (existingMembership.series_id === seriesId) {
      throw new Error("Work ini sudah menjadi ahli Siri ini.");
    }
    throw new Error("Work ini sudah menjadi ahli Siri lain.");
  }

  const maxEntry = await db
    .selectFrom("series_entries")
    .where("series_id", "=", seriesId)
    .select("position")
    .orderBy("position", "desc")
    .executeTakeFirst();
  const nextPosition = position ?? (maxEntry ? maxEntry.position + 1 : 1);

  if (position !== undefined) {
    const clash = await db
      .selectFrom("series_entries")
      .where("series_id", "=", seriesId)
      .where("position", "=", nextPosition)
      .select("id")
      .executeTakeFirst();
    if (clash) {
      throw new Error(`Position ${nextPosition} sudah digunakan dalam Siri ini.`);
    }
  }

  const now = new Date().toISOString();
  const result = await db
    .insertInto("series_entries")
    .values({
      series_id: seriesId,
      work_id: workId,
      position: nextPosition,
      created_at: now,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal menyertai episod ke Siri.");
  }

  const entry = await db
    .selectFrom("series_entries")
    .where("id", "=", result.id)
    .selectAll()
    .executeTakeFirst();
  if (!entry) {
    throw new Error("Keahlian tidak ditemui selepas penciptaan.");
  }
  return entry;
}

/**
 * Detach episode. Rejects detaching a currently published Bersiri Work
 * (must archive/unpublish first per safe editorial workflow).
 * Never deletes the Work itself.
 */
export async function detachEpisode(seriesId: string, workId: string): Promise<void> {
  const db = getAdminDb();

  const entry = await db
    .selectFrom("series_entries")
    .where("series_id", "=", seriesId)
    .where("work_id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!entry) {
    throw new Error("Keahlian episod tidak ditemui.");
  }

  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .select(["status"])
    .executeTakeFirst();
  if (work && String(work.status) === "published") {
    throw new Error(
      "Episod yang sudah terbit tidak boleh dikeluarkan terus. Arkib/ubah status terbit mengikut aliran editorial selamat terlebih dahulu."
    );
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom("series_entries")
      .where("series_id", "=", seriesId)
      .where("work_id", "=", workId)
      .execute();
    // Close gap contiguously 1..N.
    const remaining = await trx
      .selectFrom("series_entries")
      .where("series_id", "=", seriesId)
      .select("id")
      .orderBy("position", "asc")
      .execute();
    for (let i = 0; i < remaining.length; i++) {
      await trx
        .updateTable("series_entries")
        .where("id", "=", remaining[i]!.id)
        .set({ position: i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
  });
}

/**
 * Exact-set reorder for series entries. Atomic; contiguous 1..N.
 * Warns (returns flag) when reordering published continuous episodes —
 * caller/UI must confirm explicitly.
 */
export async function reorderSeriesEntries(
  seriesId: string,
  workIds: string[]
): Promise<{ entries: SeriesEntryRecord[]; reorderedPublished: boolean }> {
  const db = getAdminDb();

  const existing = await listSeriesEntries(seriesId);
  const existingIds = existing.map((e) => e.work_id).sort();
  const submittedIds = [...workIds].sort();

  if (existingIds.length !== submittedIds.length) {
    throw new Error(
      `Jangkaan ${existingIds.length} ID episod, terima ${submittedIds.length}.`
    );
  }
  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] !== submittedIds[i]) {
      throw new Error(
        `ID episod tidak sepadan: jangkaan ${existingIds[i]}, terima ${submittedIds[i]}.`
      );
    }
  }
  const unique = new Set(workIds);
  if (unique.size !== workIds.length) {
    throw new Error("ID episod berulang dalam permintaan reorder.");
  }

  // Detect if any affected Work is published (caller must confirm).
  const publishedRows = await db
    .selectFrom("works")
    .where("id", "in", workIds)
    .where("status", "=", "published")
    .select("id")
    .execute();
  const reorderedPublished = publishedRows.length > 0;

  await db.transaction().execute(async (trx) => {
    // Two-phase: park at high positions (CHECK position >= 1), then assign 1..N.
    for (let i = 0; i < workIds.length; i++) {
      await trx
        .updateTable("series_entries")
        .where("series_id", "=", seriesId)
        .where("work_id", "=", workIds[i]!)
        .set({ position: 1000000 + i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
    for (let i = 0; i < workIds.length; i++) {
      await trx
        .updateTable("series_entries")
        .where("series_id", "=", seriesId)
        .where("work_id", "=", workIds[i]!)
        .set({ position: i + 1, updated_at: new Date().toISOString() })
        .execute();
    }
    // Bump series updated_at as audit timestamp for reorder.
    await trx
      .updateTable("series")
      .where("id", "=", seriesId)
      .set({ updated_at: new Date().toISOString() })
      .execute();
  });

  return { entries: await listSeriesEntries(seriesId), reorderedPublished };
}
