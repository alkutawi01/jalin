import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * What the public Editorial page shows for a person, set by the editor in Admin > Penyumbang.
 *
 * Additive: two nullable text columns on contributors.
 *   post_title, post_duty: an editorial post ("Editor dan pemilik Jalin") and what it is responsible for. A person with a post sits
 *                          under "Penyuntingan dan penerbitan"; without one they are listed with the writers and contributors.
 * Idempotent, guarded per column (same pattern as 020).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const name of ["post_title", "post_duty"]) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contributors' AND column_name = ${name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("contributors").addColumn(name, "text").execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
  // The editor's own post, so the Editorial page does not change on the day this is run. From here it is edited in Admin > Penyumbang.
  await sql`
    UPDATE contributors
       SET post_title = 'Editor dan pemilik Jalin',
           post_duty = 'Memutuskan pemilihan, penyuntingan dan kelulusan akhir setiap penerbitan Jalin.'
     WHERE slug = 'izzat-anas' AND post_title IS NULL AND post_duty IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const name of ["post_duty", "post_title"]) {
    await db.schema.alterTable("contributors").dropColumn(name).execute().catch(() => {});
  }
}
