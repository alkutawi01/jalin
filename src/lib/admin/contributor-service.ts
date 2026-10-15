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
    throw new Error("Pangkalan data tidak tersedia.");
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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error("Alamat pautan hanya boleh mengandungi huruf kecil, angka dan sengkang.");
  }

  // Check slug uniqueness
  if (await slugExists(input.slug)) {
    throw new Error(`Alamat pautan "${input.slug}" sudah digunakan. Pilih alamat lain.`);
  }

  const now = new Date().toISOString();

  try {
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
  } catch (error) {
    // The same address saved twice at the same moment: the second is told what the check above would have said.
    if ((error as { code?: string }).code === "23505") throw new Error(`Alamat pautan "${input.slug}" sudah digunakan. Pilih alamat lain.`);
    throw error;
  }

  const contributor = await getContributor(input.slug);
  if (!contributor) {
    throw new Error("Penyumbang tidak dapat dibuat.");
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
  if (input.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error("Alamat pautan hanya boleh mengandungi huruf kecil, angka dan sengkang.");
  }

  // Check slug uniqueness if slug is being changed
  if (input.slug && input.slug !== slug) {
    if (await slugExists(input.slug, slug)) {
      throw new Error(`Alamat pautan "${input.slug}" sudah digunakan. Pilih alamat lain.`);
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

  const renaming = Boolean(input.slug && input.slug !== slug);

  await db.transaction().execute(async (trx) => {
    if (!renaming) {
      const updated = await trx.updateTable("contributors").where("slug", "=", slug).set(updateData).executeTakeFirst();
      if (Number(updated.numUpdatedRows) !== 1) throw new Error("Penyumbang tidak ditemui.");
      return;
    }

    // A published work shows its credits from the version frozen when it was published, and that version names the contributor by
    // the old address: after a rename those bylines would find no one.
    const onPublished = await trx
      .selectFrom("credits")
      .innerJoin("works", "works.id", "credits.work_id")
      .where("credits.contributor_slug", "=", slug)
      .where("works.status", "=", "published")
      .select("works.id")
      .executeTakeFirst();
    if (onPublished) {
      throw new Error("Alamat pautan tidak boleh ditukar kerana penyumbang ini dikreditkan pada karya yang sudah terbit. Tukar nama paparan sahaja.");
    }

    // credits and submission_contributions point at contributors.slug without ON UPDATE CASCADE, so changing the slug in place fails
    // as soon as there is one credit. Make the record under the new address, move the references to it, then remove the old one.
    const old = await trx.selectFrom("contributors").where("slug", "=", slug).selectAll().executeTakeFirst();
    if (!old) throw new Error("Penyumbang tidak ditemui.");
    await trx.insertInto("contributors").values({ ...old, ...updateData, slug: input.slug as string } as never).execute();
    await trx.updateTable("credits").set({ contributor_slug: input.slug as string }).where("contributor_slug", "=", slug).execute();
    await trx.updateTable("submission_contributions").set({ contributor_slug: input.slug as string }).where("contributor_slug", "=", slug).execute();
    await trx.deleteFrom("contributors").where("slug", "=", slug).execute();
  });

  const targetSlug = input.slug || slug;
  const contributor = await getContributor(targetSlug);
  if (!contributor) {
    throw new Error("Penyumbang tidak ditemui selepas dikemas kini.");
  }

  return contributor;
}

/**
 * Delete a contributor nobody uses: a record left over (a duplicate made by mistake). One that appears in any credit, in a submission,
 * or as an AI's pseudonym is refused with what holds it, so a name already printed under a work cannot be pulled out from under it.
 */
export async function deleteUnusedContributor(slug: string): Promise<void> {
  const db = getAdminDb();
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom("contributors").select("slug").where("slug", "=", slug).forUpdate().executeTakeFirst();
    if (!row) throw new Error("Penyumbang tidak ditemui.");
    const credits = await trx.selectFrom("credits").select("id").where("contributor_slug", "=", slug).execute();
    if (credits.length) throw new Error(`Penyumbang ini masih dipakai dalam ${credits.length} kredit karya. Alihkan atau buang kredit itu dahulu.`);
    const submissions = await trx.selectFrom("submission_contributions").select("contributor_slug").where("contributor_slug", "=", slug).execute();
    if (submissions.length) throw new Error(`Penyumbang ini disebut dalam ${submissions.length} kiriman. Tidak boleh dipadam.`);
    const persona = await trx.selectFrom("prompt_templates").select("name").where("scope", "=", "ai_persona").where("status", "=", "active").where("prompt_text", "=", slug).execute();
    if (persona.length) throw new Error(`Penyumbang ini ialah nama samaran bagi ${persona.map((p) => p.name).join(", ")}. Tukar nama samaran AI itu di Tetapan dahulu.`);
    await trx.deleteFrom("contributors").where("slug", "=", slug).execute();
  });
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
