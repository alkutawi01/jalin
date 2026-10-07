/**
 * Admin Visual Service
 *
 * Database operations for managing work visuals in admin console.
 * Handles hero, inline, and section visuals with Magnific provenance.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import type { VisualRole, VisualPlace } from "../db/types";
import { isImageMarker } from "../reader/image-markers";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("Pangkalan data tidak tersedia.");
  }
  return getDb();
}

export interface VisualInput {
  workId: string;
  role: VisualRole;
  src: string;
  alt?: string;
  provider?: string;
  creationId?: string;
  anchor?: string;
  place?: VisualPlace;
  sortOrder: number;
  /** Crop: point of interest (0-100) and zoom (100-300). null clears. */
  focusX?: number | null;
  focusY?: number | null;
  zoom?: number | null;
  sectionSlug?: string | null;
}

export interface VisualRecord {
  id: number;
  work_id: string;
  role: VisualRole;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: VisualPlace;
  sort_order: number;
  is_asset_finalized: boolean;
  created_at: Date;
}

/**
 * List all visuals for a work.
 */
export async function listVisualsForWork(workId: string): Promise<VisualRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("visuals")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

/**
 * Get a single visual by ID.
 */
export async function getVisual(id: number): Promise<VisualRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("visuals")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Create a new visual.
 */
export async function createVisual(input: VisualInput): Promise<VisualRecord> {
  const db = getAdminDb();

  // A work has one hero: checked under a lock on the work, like when a picture is changed into a hero (a hero has no marker).
  const result = await db.transaction().execute(async (trx) => {
    await trx.selectFrom("works").where("id", "=", input.workId).select("id").forUpdate().executeTakeFirst();
    if (input.role === "hero") {
      const otherHero = await trx.selectFrom("visuals").where("work_id", "=", input.workId).where("role", "=", "hero").select("id").executeTakeFirst();
      if (otherHero) throw new Error("Karya ini sudah mempunyai hero. Padam atau tukar hero lama dahulu.");
    }
    return trx
      .insertInto("visuals")
      .values({
        work_id: input.workId,
        role: input.role,
        src: input.src,
        alt: input.alt || null,
        provider: input.provider || null,
        creation_id: input.creationId || null,
        anchor: input.role === "hero" ? null : input.anchor || null,
        place: input.place || "after",
        sort_order: input.sortOrder,
        is_asset_finalized: false,
        created_at: new Date().toISOString(),
      })
      .returning("id")
      .executeTakeFirst();
  });

  if (!result) {
    throw new Error("Gambar tidak dapat dibuat.");
  }

  const visual = await getVisual(result.id);
  if (!visual) {
    throw new Error("Gambar tidak ditemui selepas dibuat.");
  }

  return visual;
}

/**
 * Update an existing visual.
 */
export async function updateVisual(
  id: number,
  input: Partial<VisualInput>
): Promise<VisualRecord> {
  const db = getAdminDb();

  const updateData: Record<string, unknown> = {};

  if (input.role !== undefined) updateData.role = input.role;
  if (input.src !== undefined) updateData.src = input.src;
  if (input.alt !== undefined) updateData.alt = input.alt || null;
  if (input.provider !== undefined) updateData.provider = input.provider || null;
  if (input.creationId !== undefined) updateData.creation_id = input.creationId || null;
  if (input.anchor !== undefined) updateData.anchor = input.anchor || null;
  if (input.place !== undefined) updateData.place = input.place;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.focusX !== undefined) updateData.focus_x = input.focusX === null ? null : Math.round(Math.min(100, Math.max(0, input.focusX)));
  if (input.focusY !== undefined) updateData.focus_y = input.focusY === null ? null : Math.round(Math.min(100, Math.max(0, input.focusY)));
  if (input.zoom !== undefined) updateData.zoom = input.zoom === null ? null : Math.round(Math.min(300, Math.max(100, input.zoom)));
  if (input.sectionSlug !== undefined) updateData.section_slug = input.sectionSlug || null;

  // The rules about heroes and markers are checked here, under a lock on the work, so two editors changing pictures at once cannot both pass:
  // at most one work-level hero (a hero has no marker) and a marker belongs to one picture within its own text (the work's or one chapter's).
  await db.transaction().execute(async (trx) => {
    const current = await trx.selectFrom("visuals").where("id", "=", id).selectAll().forUpdate().executeTakeFirst();
    if (!current) throw new Error("Gambar tidak ditemui.");
    await trx.selectFrom("works").where("id", "=", current.work_id).select("id").forUpdate().executeTakeFirst();
    const role = input.role ?? current.role;
    const currentSection = (current as { section_slug?: string | null }).section_slug ?? null;
    const section = input.sectionSlug !== undefined ? input.sectionSlug || null : currentSection;
    // Only what this change touches is judged: a crop or caption edit on a picture must not fail because of an older problem elsewhere.
    const becomesHero = role === "hero" && current.role !== "hero";
    const movesMarker = input.anchor !== undefined || input.sectionSlug !== undefined || (input.role !== undefined && input.role !== current.role);
    if (becomesHero) {
      const otherHero = await trx.selectFrom("visuals").where("work_id", "=", current.work_id).where("role", "=", "hero").where("id", "!=", id).select("id").executeTakeFirst();
      if (otherHero) throw new Error("Karya ini sudah mempunyai hero. Padam atau tukar hero lama dahulu.");
      updateData.anchor = null;
    } else if (role !== "hero" && movesMarker) {
      const anchor = input.anchor !== undefined ? input.anchor || null : current.anchor;
      if (isImageMarker(anchor)) {
        let clash = trx.selectFrom("visuals").where("work_id", "=", current.work_id).where("anchor", "=", anchor).where("id", "!=", id);
        clash = section ? clash.where("section_slug" as never, "=", section as never) : clash.where("section_slug" as never, "is", null as never);
        if (await clash.select("id").executeTakeFirst()) throw new Error("Penanda ini sudah digunakan oleh gambar lain.");
      }
    }
    if (Object.keys(updateData).length > 0) await trx.updateTable("visuals").where("id", "=", id).set(updateData).execute();
  });

  const visual = await getVisual(id);
  if (!visual) {
    throw new Error("Gambar tidak ditemui selepas dikemas kini.");
  }

  return visual;
}

/**
 * Delete a visual.
 * Does not delete physical image files.
 */
export async function deleteVisual(id: number): Promise<void> {
  const db = getAdminDb();

  await db
    .deleteFrom("visuals")
    .where("id", "=", id)
    .execute();
}

/**
 * Reorder visuals for a work.
 * Normalizes sort_order to sequential values (1, 2, 3...).
 */
export async function reorderVisuals(
  workId: string,
  visualIds: number[]
): Promise<VisualRecord[]> {
  const db = getAdminDb();

  // The list must be exactly this work's pictures, each once: a missing, repeated or foreign id would leave an order that means nothing.
  if (!Array.isArray(visualIds) || visualIds.some((id) => !Number.isInteger(id) || id < 1) || new Set(visualIds).size !== visualIds.length) {
    throw new Error("Senarai gambar tidak sah: mesti nombor bulat, tanpa pengulangan.");
  }
  await db.transaction().execute(async (trx) => {
    const owned = await trx.selectFrom("visuals").where("work_id", "=", workId).select("id").forUpdate().execute();
    const ownedIds = new Set(owned.map((row) => Number(row.id)));
    if (ownedIds.size !== visualIds.length || visualIds.some((id) => !ownedIds.has(id))) {
      throw new Error("Senarai gambar tidak sah: mesti tepat gambar karya ini, tidak kurang dan tidak lebih.");
    }
    for (let i = 0; i < visualIds.length; i++) {
      await trx.updateTable("visuals").where("id", "=", visualIds[i]!).where("work_id", "=", workId).set({ sort_order: i + 1 }).execute();
    }
  });

  // Return updated list
  return listVisualsForWork(workId);
}
