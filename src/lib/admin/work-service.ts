/**
 * Admin Work Service
 *
 * Database operations for managing works in admin console.
 * Separated from public content repository.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import type { WorkType, WorkStatus } from "../db/types";

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
  editorial_history: unknown;
  published_at: Date | null;
  updated_at: Date;
  created_at: Date;
}

/**
 * List all works from database.
 */
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
      version: input.version || "v0.1",
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
      version: input.version || "v0.1",
      editorial_history: JSON.stringify(editorialHistory),
      published_at: input.publishedAt || null,
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

  await db
    .updateTable("works")
    .where("id", "=", id)
    .set(updateData)
    .execute();

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
