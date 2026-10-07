/**
 * Admin Credit Service
 *
 * Database operations for managing work credits in admin console.
 * Handles per-work credit assignments with flexible roles.
 */

import { Kysely, sql } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import { isDerivativeType } from "../credit-roles";
import { findDuplicateCredit } from "./metadata-rules";

/** The same person in the same role is already credited on this work. */
export class DuplicateCreditError extends Error {}

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("Pangkalan data tidak tersedia.");
  }
  return getDb();
}

export interface CreditInput {
  workId: string;
  contributorSlug?: string;
  guestName?: string;
  roleLabel: string;
  byline: boolean;
  isPublic: boolean;
  sortOrder: number;
}

export interface CreditRecord {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: Date;
}

/** Sinopsis and fragmen have no "Nama di bawah tajuk": the name there is the original author, shown automatically (credit-roles.ts). */
async function bylineAllowed(db: Kysely<Database>, workId: string): Promise<boolean> {
  const work = await db.selectFrom("works").where("id", "=", workId).select("type").executeTakeFirst();
  return !isDerivativeType(work?.type);
}

/**
 * List all credits for a work.
 */
export async function listCreditsForWork(workId: string): Promise<CreditRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

/**
 * Get a single credit by ID.
 */
export async function getCredit(id: number): Promise<CreditRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("credits")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Create a new credit.
 * Enforces XOR: exactly one of contributorSlug or guestName must be provided.
 */
export async function createCredit(input: CreditInput): Promise<CreditRecord> {
  const db = getAdminDb();

  // Enforce XOR: exactly one of contributorSlug or guestName
  if (!input.contributorSlug && !input.guestName) {
    throw new Error("Pilih penyumbang atau isi nama tetamu.");
  }
  if (input.contributorSlug && input.guestName) {
    throw new Error("Pilih penyumbang atau nama tetamu, bukan kedua-duanya.");
  }

  // If contributorSlug provided, verify it exists
  if (input.contributorSlug) {
    const contributor = await db
      .selectFrom("contributors")
      .where("slug", "=", input.contributorSlug)
      .select("slug")
      .executeTakeFirst();

    if (!contributor) {
      throw new Error(`Penyumbang "${input.contributorSlug}" tidak ditemui. Muat semula halaman dan pilih semula.`);
    }
  }

  const now = new Date().toISOString();
  const byline = input.byline && (await bylineAllowed(db, input.workId));

  // Two requests at the same moment (a double click on "Tambah kredit") each saw no such credit and both wrote one: a published
  // episode had the same co-writer twice. The check and the write now happen one request at a time for a work.
  const result = await db.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"credits:" + input.workId}))`.execute(trx);
    const existing = await trx.selectFrom("credits").where("work_id", "=", input.workId).select(["id", "contributor_slug", "guest_name", "role_label"]).execute();
    const duplicate = findDuplicateCredit(existing, { contributorSlug: input.contributorSlug, guestName: input.guestName, roleLabel: input.roleLabel });
    if (duplicate) {
      throw new DuplicateCreditError(`Kredit ini sudah ada: ${duplicate.contributor_slug ?? duplicate.guest_name} sebagai ${duplicate.role_label}. Ubah yang sedia ada, atau pilih peranan lain.`);
    }
    return trx
      .insertInto("credits")
      .values({
        work_id: input.workId,
        contributor_slug: input.contributorSlug || null,
        guest_name: input.guestName || null,
        role_label: input.roleLabel,
        byline,
        is_public: input.isPublic,
        sort_order: input.sortOrder,
        created_at: now,
      })
      .returning("id")
      .executeTakeFirst();
  });

  if (!result) {
    throw new Error("Kredit tidak dapat dibuat.");
  }

  const credit = await getCredit(result.id);
  if (!credit) {
    throw new Error("Kredit tidak ditemui selepas dibuat.");
  }

  return credit;
}

/**
 * Update an existing credit.
 */
export async function updateCredit(
  id: number,
  input: Partial<CreditInput>
): Promise<CreditRecord> {
  const db = getAdminDb();

  // A credit names either a contributor or a guest, never both. Choosing one clears the other,
  // so switching a guest credit to a contributor (or the reverse) cannot leave both set.
  const hasSlug = Boolean(input.contributorSlug);
  const hasGuest = Boolean(input.guestName);
  if (input.contributorSlug === undefined && input.guestName === undefined) {
    // No change to contributor/guest, skip validation
  } else if (!hasSlug && !hasGuest) {
    throw new Error("Pilih penyumbang atau isi nama tetamu.");
  } else if (hasSlug && hasGuest) {
    // The form may send both while the editor switches; a contributor takes precedence.
    input = { ...input, guestName: "" };
  }

  // If contributorSlug provided, verify it exists
  if (input.contributorSlug) {
    const contributor = await db
      .selectFrom("contributors")
      .where("slug", "=", input.contributorSlug)
      .select("slug")
      .executeTakeFirst();

    if (!contributor) {
      throw new Error(`Penyumbang "${input.contributorSlug}" tidak ditemui. Muat semula halaman dan pilih semula.`);
    }
  }

  const updateData: Record<string, unknown> = {};

  if (input.contributorSlug !== undefined) updateData.contributor_slug = input.contributorSlug || null;
  if (input.guestName !== undefined) updateData.guest_name = input.guestName || null;
  if (hasSlug && input.guestName === undefined) updateData.guest_name = null;
  if (hasGuest && input.contributorSlug === undefined) updateData.contributor_slug = null;
  if (input.roleLabel !== undefined) updateData.role_label = input.roleLabel;
  if (input.byline !== undefined) {
    const current = await getCredit(id);
    updateData.byline = input.byline && (current ? await bylineAllowed(db, current.work_id) : true);
  }
  if (input.isPublic !== undefined) updateData.is_public = input.isPublic;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  await db
    .updateTable("credits")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const credit = await getCredit(id);
  if (!credit) {
    throw new Error("Kredit tidak ditemui selepas dikemas kini.");
  }

  return credit;
}

/**
 * Delete a credit.
 */
export async function deleteCredit(id: number): Promise<void> {
  const db = getAdminDb();

  await db
    .deleteFrom("credits")
    .where("id", "=", id)
    .execute();
}

/**
 * Reorder credits for a work.
 * Uses a single transaction to ensure atomicity.
 * Requires exact set equality: submitted IDs must equal all credit IDs for the Work.
 * Normalizes sort_order to sequential values (1, 2, 3...).
 */
export async function reorderCredits(
  workId: string,
  creditIds: number[]
): Promise<CreditRecord[]> {
  const db = getAdminDb();

  // Get all existing credit IDs for this work
  const existingCredits = await db
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .select("id")
    .execute();

  const existingIds = existingCredits.map((c) => c.id).sort();
  const submittedIds = [...creditIds].sort();

  // Exact set equality: submitted IDs must equal all credit IDs
  if (existingIds.length !== submittedIds.length) {
    throw new Error("Senarai kredit karya ini telah berubah (kredit ditambah atau dipadam di tempat lain). Muat semula halaman, kemudian susun semula.");
  }

  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] !== submittedIds[i]) {
      throw new Error("Senarai kredit karya ini telah berubah (kredit ditambah atau dipadam di tempat lain). Muat semula halaman, kemudian susun semula.");
    }
  }

  // Check no duplicates
  const uniqueIds = new Set(creditIds);
  if (uniqueIds.size !== creditIds.length) {
    throw new Error("Kredit yang sama disenaraikan dua kali dalam susunan baharu.");
  }

  // Use transaction for atomicity
  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < creditIds.length; i++) {
      await trx
        .updateTable("credits")
        .where("id", "=", creditIds[i])
        .where("work_id", "=", workId)
        .set({ sort_order: i + 1 })
        .execute();
    }
  });

  // Return updated list
  return listCreditsForWork(workId);
}
