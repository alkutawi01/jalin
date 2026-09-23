/**
 * Admin Contributor Service
 *
 * Database operations for managing contributors in admin console.
 * Handles human, virtual, and organization contributors.
 *
 * IMPORTANT: Internal AI identity fields are admin-only and must never leak to public APIs.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import type { ContributorKind } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[ContributorService] Database not available.");
  }
  return getDb();
}

export interface ContributorInput {
  displayName: string;
  slug: string;
  kind: ContributorKind;
  bio?: string;
  disclosure?: string;
  isVisible?: boolean;
}

export interface ContributorRecord {
  slug: string;
  display_name: string;
  kind: ContributorKind;
  bio: string | null;
  disclosure: string | null;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * List all contributors from database.
 */
export async function listContributors(): Promise<ContributorRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("contributors")
    .selectAll()
    .orderBy("display_name", "asc")
    .execute();
}

/**
 * Get a single contributor by slug.
 */
export async function getContributor(slug: string): Promise<ContributorRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("contributors")
    .where("slug", "=", slug)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Check if slug already exists.
 */
export async function slugExists(slug: string, excludeSlug?: string): Promise<boolean> {
  const db = getAdminDb();
  let query = db
    .selectFrom("contributors")
    .where("slug", "=", slug)
    .select("slug");

  if (excludeSlug) {
    query = query.where("slug", "!=", excludeSlug);
  }

  const result = await query.executeTakeFirst();
  return !!result;
}

/**
 * Create a new contributor.
 */
export async function createContributor(input: ContributorInput): Promise<ContributorRecord> {
  const db = getAdminDb();

  // Check slug uniqueness
  if (await slugExists(input.slug)) {
    throw new Error(`Slug "${input.slug}" already exists.`);
  }

  const now = new Date().toISOString();

  await db
    .insertInto("contributors")
    .values({
      slug: input.slug,
      display_name: input.displayName,
      kind: input.kind,
      bio: input.bio || null,
      disclosure: input.disclosure || null,
      is_visible: input.isVisible !== false,
      created_at: now,
      updated_at: now,
    })
    .execute();

  const contributor = await getContributor(input.slug);
  if (!contributor) {
    throw new Error("Failed to create contributor.");
  }

  return contributor;
}

/**
 * Update an existing contributor.
 */
export async function updateContributor(
  slug: string,
  input: Partial<ContributorInput>
): Promise<ContributorRecord> {
  const db = getAdminDb();

  // Check slug uniqueness if slug is being changed
  if (input.slug && input.slug !== slug) {
    if (await slugExists(input.slug, slug)) {
      throw new Error(`Slug "${input.slug}" already exists.`);
    }
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.kind !== undefined) updateData.kind = input.kind;
  if (input.bio !== undefined) updateData.bio = input.bio || null;
  if (input.disclosure !== undefined) updateData.disclosure = input.disclosure || null;
  if (input.isVisible !== undefined) updateData.is_visible = input.isVisible;

  await db
    .updateTable("contributors")
    .where("slug", "=", slug)
    .set(updateData)
    .execute();

  const targetSlug = input.slug || slug;
  const contributor = await getContributor(targetSlug);
  if (!contributor) {
    throw new Error("Contributor not found after update.");
  }

  return contributor;
}

/**
 * Hide a contributor (soft delete).
 * Sets is_visible to false while preserving all data.
 */
export async function hideContributor(slug: string): Promise<ContributorRecord> {
  return updateContributor(slug, { isVisible: false });
}

/**
 * Show a contributor (restore from hidden).
 */
export async function showContributor(slug: string): Promise<ContributorRecord> {
  return updateContributor(slug, { isVisible: true });
}
