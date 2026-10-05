/**
 * Guard for the scripts that build a fixture and delete it again (scripts/controlled-*-test.ts, qa-fixtures.ts,
 * waktu-sebenar-structure-test.ts).
 *
 * Why: on 28 Sep 2026 scripts/waktu-sebenar-structure-test.ts ran against the production database. Its fixture used the same
 * id as the real novela (JLN-NOV-9990), and its first step deletes everything for that id (sections, credits, visuals, ...,
 * the work itself) before inserting a non-public fixture. The real "Waktu Sebenar" disappeared and an archived test shell was
 * left behind. Nothing in the scripts checked what they were about to delete, or where.
 *
 * Now every such script calls assertDisposableFixtures() before its first delete. A row that matches the fixture's id or slug
 * may only be removed if it is itself a fixture (slug "uji-...", or id "work-uji-...") and has never been published.
 * Anything else stops the script with an explanation, whichever database it is connected to.
 */

export interface FixtureRow {
  id: string;
  slug: string;
  status: string;
  published_revision_id?: unknown;
  published_at?: unknown;
}

/** True only for a work that is clearly a test fixture and was never published. */
export function isDisposableFixture(row: FixtureRow): boolean {
  const looksLikeFixture = /^uji-/.test(row.slug) || /^work-uji-/.test(row.id);
  const neverPublished = row.status !== "published" && !row.published_revision_id && !row.published_at;
  return looksLikeFixture && neverPublished;
}

/** Throws if anything that matches the fixture ids or slugs is a real work. Call it before the first delete. */
export async function assertDisposableFixtures(
  db: { selectFrom: (table: never) => any },
  fixtures: { ids?: readonly string[]; slugs?: readonly string[] }
): Promise<void> {
  const ids = [...(fixtures.ids ?? [])];
  const slugs = [...(fixtures.slugs ?? [])];
  if (ids.length === 0 && slugs.length === 0) return;
  const rows: FixtureRow[] = await db
    .selectFrom("works" as never)
    .select(["id", "slug", "status", "published_revision_id", "published_at"] as never)
    .where((eb: any) => eb.or([...(ids.length ? [eb("id", "in", ids)] : []), ...(slugs.length ? [eb("slug", "in", slugs)] : [])]))
    .execute();
  const real = rows.filter((row) => !isDisposableFixture(row));
  if (real.length > 0) {
    const list = real.map((row) => `${row.id} (${row.slug}, ${row.status})`).join(", ");
    throw new Error(
      `Menolak memadam: ${list} bukan fixture ujian (slug mesti bermula "uji-" dan belum pernah terbit). ` +
        `Skrip ini akan memusnahkan karya sebenar. Semak DATABASE_URL dan ID fixture.`
    );
  }
}
