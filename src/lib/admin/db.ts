/**
 * Admin Database Access Boundary
 *
 * This module provides database operations for admin use.
 * Separated from public content repository to maintain clear boundaries.
 *
 * IMPORTANT: Admin code should NOT directly import reader components.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

/**
 * Get database connection for admin operations.
 * Throws if database is not available.
 */
function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error(
      "[AdminDB] Database not available. Set DATABASE_URL to enable admin features."
    );
  }
  return getDb();
}

/**
 * Get summary statistics for admin dashboard.
 */
export async function getAdminStats() {
  const db = getAdminDb();

  const worksCount = await db
    .selectFrom("works")
    .select((eb) => eb.fn.count("id").as("count"))
    .executeTakeFirst();

  const contributorsCount = await db
    .selectFrom("contributors")
    .select((eb) => eb.fn.count("slug").as("count"))
    .executeTakeFirst();

  const creditsCount = await db
    .selectFrom("credits")
    .select((eb) => eb.fn.count("id").as("count"))
    .executeTakeFirst();

  return {
    totalWorks: Number(worksCount?.count ?? 0),
    totalContributors: Number(contributorsCount?.count ?? 0),
    totalCredits: Number(creditsCount?.count ?? 0),
  };
}

/**
 * Get all works for admin listing.
 */
export async function getAdminWorks() {
  const db = getAdminDb();

  return db
    .selectFrom("works")
    .select(["id", "slug", "title", "type", "status", "updated_at"])
    .orderBy("updated_at", "desc")
    .execute();
}

/**
 * Get all contributors for admin listing.
 */
export async function getAdminContributors() {
  const db = getAdminDb();

  return db
    .selectFrom("contributors")
    .select(["slug", "display_name", "kind", "created_at"])
    .orderBy("display_name", "asc")
    .execute();
}
