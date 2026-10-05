/**
 * The test scripts that build a fixture and delete it again must never be able to delete a real work.
 * (28 Sep 2026: scripts/waktu-sebenar-structure-test.ts used the id of the real Waktu Sebenar, JLN-NOV-9990, ran against the
 * production database and deleted it. Neon keeps one day of history and there are no snapshots, so it could not be restored.)
 */
import fs from "node:fs";
import path from "node:path";
import { assertDisposableFixtures, isDisposableFixture, requireDestructiveOptIn, useTestDatabase, type FixtureRow } from "../scripts/lib/disposable-fixture";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const fixture: FixtureRow = { id: "JLN-NOV-9998", slug: "uji-novela-4d8", status: "draft" };
const published: FixtureRow = { id: "JLN-NOV-9991", slug: "sekuntum-bunga-untuk-alia", status: "published", published_revision_id: "rev-1" };
const archivedShell: FixtureRow = { id: "JLN-NOV-9990", slug: "uji-waktu-sebenar-4d8r", status: "archived" };
const realDraft: FixtureRow = { id: "JLN-NOV-9990", slug: "waktu-sebenar", status: "review" };

assert(isDisposableFixture(fixture), "a draft with an uji- slug is a fixture");
assert(isDisposableFixture(archivedShell), "an archived uji- fixture may be replaced");
assert(isDisposableFixture({ id: "work-uji-snapshot-leak", slug: "x", status: "draft" }), "an id starting work-uji- is a fixture");
assert(!isDisposableFixture(published), "a published work is never disposable (Sekuntum Bunga untuk Alia, JLN-NOV-9991)");
assert(!isDisposableFixture(realDraft), "an unpublished real work is not disposable either (the real Waktu Sebenar was in review)");
assert(!isDisposableFixture({ ...fixture, status: "published" }), "even an uji- fixture is not disposable once published");
assert(!isDisposableFixture({ ...fixture, published_at: "2026-10-01" }), "...or once it has a publication date");

// a fake database: select(...).where(callback).execute() over a list of rows
function fakeDb(rows: FixtureRow[]) {
  return {
    selectFrom: () => ({
      select: () => ({
        where: (build: (eb: any) => unknown) => ({
          execute: async () => {
            const conditions: Array<(row: FixtureRow) => boolean> = [];
            const eb: any = (column: keyof FixtureRow, _op: string, values: string[]) => (row: FixtureRow) => values.includes(String(row[column]));
            eb.or = (list: Array<(row: FixtureRow) => boolean>) => { conditions.push(...list); return list; };
            build(eb);
            return rows.filter((row) => conditions.some((condition) => condition(row)));
          }
        })
      })
    })
  };
}
async function refused(rows: FixtureRow[], ids: string[], slugs: string[]): Promise<string | null> {
  try { await assertDisposableFixtures(fakeDb(rows) as never, { ids, slugs }); return null; } catch (e) { return (e as Error).message; }
}

(async () => {
  // Second lock: without an explicit opt-in for this run nothing is deleted, whatever the database.
  const saved = process.env.ALLOW_DESTRUCTIVE_TESTS;
  delete process.env.ALLOW_DESTRUCTIVE_TESTS;
  assert((await refused([], ["JLN-NOV-9998"], ["uji-novela-4d8"])) !== null, "no ALLOW_DESTRUCTIVE_TESTS: refused even for a clean fixture");
  assert(((): boolean => { try { requireDestructiveOptIn({ ALLOW_DESTRUCTIVE_TESTS: "yes" }); return false; } catch { return true; } })(), "only the exact value true counts");
  assert(((): boolean => { try { requireDestructiveOptIn({ ALLOW_DESTRUCTIVE_TESTS: "true" }); return true; } catch { return false; } })(), "true lets the run continue to the fixture check");
  assert(!fs.existsSync(path.join(__dirname, "../scripts/import-waktu-sebenar.ts")) && !fs.existsSync(path.join(__dirname, "../scripts/assign-author-waktu-sebenar.ts")), "the two old one-off Waktu Sebenar scripts (hard-coded id, delete) are gone");
  // Third lock: the scripts use TEST_DATABASE_URL, never the application's DATABASE_URL.
  const thrown = (fn: () => void): string | null => { try { fn(); return null; } catch (e) { return (e as Error).message; } };
  assert(thrown(() => useTestDatabase({ ALLOW_DESTRUCTIVE_TESTS: "true", DATABASE_URL: "postgres://prod" }))?.includes("TEST_DATABASE_URL tiada") === true, "no TEST_DATABASE_URL: refused, the application's DATABASE_URL is never used");
  assert(thrown(() => useTestDatabase({ ALLOW_DESTRUCTIVE_TESTS: "true", DATABASE_URL: "postgres://prod", TEST_DATABASE_URL: "postgres://prod" }))?.includes("sama dengan DATABASE_URL") === true, "the 'test' URL equal to the application's: refused");
  assert(thrown(() => useTestDatabase({ DATABASE_URL: "postgres://prod", TEST_DATABASE_URL: "postgres://branch" }))?.includes("ALLOW_DESTRUCTIVE_TESTS") === true, "without the opt-in: refused even with a test URL");
  const okEnv: Record<string, string | undefined> = { ALLOW_DESTRUCTIVE_TESTS: "true", DATABASE_URL: "postgres://prod", TEST_DATABASE_URL: "postgres://branch" };
  assert(thrown(() => useTestDatabase(okEnv)) === null && okEnv.DATABASE_URL === "postgres://branch", "with both locks the script is pointed at the test database");
  process.env.ALLOW_DESTRUCTIVE_TESTS = "true";
  assert((await refused([], ["JLN-NOV-9998"], ["uji-novela-4d8"])) === null, "nothing there yet: fine");
  assert((await refused([fixture], ["JLN-NOV-9998"], ["uji-novela-4d8"])) === null, "a leftover fixture from an earlier run: fine");
  const real = await refused([published], ["JLN-NOV-9991"], ["uji-novela-race-4d8r"]);
  assert(real !== null && real.includes("JLN-NOV-9991") && real.includes("bukan fixture ujian"), `the id of a real, published work stops the script (${real?.slice(0, 60)}...)`);
  const waktu = await refused([realDraft], ["JLN-NOV-9990"], ["uji-waktu-sebenar-4d8r"]);
  assert(waktu !== null && waktu.includes("waktu-sebenar"), "the exact 28 Sep case (fixture id equal to the real Waktu Sebenar) is refused");
  assert((await refused([published, fixture], ["JLN-NOV-9998"], ["uji-novela-4d8"])) === null, "an unrelated real work is not looked at");
  assert((await refused([published], [], [])) === null, "no ids and no slugs: nothing to check");

  // every destructive script uses the guard before its first delete
  const root = path.join(__dirname, "..", "scripts");
  const scripts = fs.readdirSync(root).filter((f) => f.endsWith(".ts")).filter((f) => /deleteFrom\("works"\)/.test(fs.readFileSync(path.join(root, f), "utf8")));
  assert(scripts.length >= 10, `found the scripts that delete works (${scripts.length})`);
  for (const file of scripts) {
    const source = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
    const guard = source.indexOf("await assertDisposableFixtures(");
    const firstDelete = source.search(/await db\s*\.deleteFrom\(/);
    const pointed = source.indexOf("useTestDatabase();");
    assert(pointed > 0 && pointed < source.indexOf("= getDb()"), `${file} points itself at TEST_DATABASE_URL before it opens any connection`);
    assert(guard > 0 && firstDelete > guard, `${file} checks what it is about to delete before its first delete`);
  }
  // the ids that collided with real works are not used by the fixtures any more
  assert(!fs.readFileSync(path.join(root, "controlled-novela-race-test.ts"), "utf8").includes("const TEST_ID = \"JLN-NOV-9991\""), "the novela race fixture no longer uses the id of Sekuntum Bunga untuk Alia");
  assert(!fs.readFileSync(path.join(root, "waktu-sebenar-structure-test.ts"), "utf8").includes("const TEST_ID = \"JLN-NOV-9990\""), "the Waktu Sebenar structure fixture no longer uses the id of the real Waktu Sebenar");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
