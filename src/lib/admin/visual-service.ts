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

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[VisualService] Database not available.");
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

  const result = await db
    .insertInto("visuals")
    .values({
      work_id: input.workId,
      role: input.role,
      src: input.src,
      alt: input.alt || null,
      provider: input.provider || null,
      creation_id: input.creationId || null,
      anchor: input.anchor || null,
      place: input.place || "after",
      sort_order: input.sortOrder,
      is_asset_finalized: false,
      created_at: new Date().toISOString(),
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Failed to create visual.");
  }

  const visual = await getVisual(result.id);
  if (!visual) {
    throw new Error("Visual not found after creation.");
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

  await db
    .updateTable("visuals")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const visual = await getVisual(id);
  if (!visual) {
    throw new Error("Visual not found after update.");
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

  // Update each visual's sort_order
  for (let i = 0; i < visualIds.length; i++) {
    await db
      .updateTable("visuals")
      .where("id", "=", visualIds[i])
      .where("work_id", "=", workId)
      .set({ sort_order: i + 1 })
      .execute();
  }

  // Return updated list
  return listVisualsForWork(workId);
}
