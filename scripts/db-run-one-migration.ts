/**
 * Run ONE schema migration on its own: `npx tsx scripts/db-run-one-migration.ts 031_contributor_profile`.
 *
 * `npm run db:schema:migrate` applies every migration file in the folder, so a migration someone else has written but not shipped yet
 * would go to the database too. This runs only the one named, for the case where just that one is wanted on a database (the production
 * rollout of an additive migration). It prints the host it is about to change, so the editor can see which database that is. The migration must be idempotent (all of them are): the next `db:schema:migrate` finds it unrecorded
 * in the ledger, runs it again as a no-op and records it. Like every database command here it uses the direct (unpooled) address and
 * refuses a database that is not the development branch unless ALLOW_NON_DEV_DATABASE=yes is set for this one command.
 */
import "dotenv/config";
import { config } from "dotenv";
// No override: a DATABASE_URL_UNPOOLED set in the shell for this one command wins over .env.local (which holds the development branch).
config({ path: ".env.local", override: false });
import path from "node:path";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { databaseSslEnabled, requireMigrationDatabaseUrl } from "../src/lib/db/env";

const name = process.argv[2] ?? "";
if (!/^\d{3}_[a-z0-9_]+$/.test(name)) {
  console.error("Usage: npx tsx scripts/db-run-one-migration.ts NNN_snake_case_name");
  process.exit(1);
}

async function main() {
  const url = requireMigrationDatabaseUrl();
  let host = "?";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL_UNPOOLED is not a valid address (did you paste a placeholder?).");
  }
  console.log(`Database host: ${host}`);
  const pool = new Pool({ connectionString: url, ssl: databaseSslEnabled() ? { rejectUnauthorized: false } : false, max: 1 });
  const db = new Kysely<unknown>({ dialect: new PostgresDialect({ pool }) });
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const migration = require(path.join(__dirname, "..", "src", "lib", "db", "migrations", name)) as { up?: (db: Kysely<unknown>) => Promise<void> };
    if (typeof migration.up !== "function") throw new Error(`Migration ${name} must export up(db).`);
    await migration.up(db);
    console.log(`✓ ${name}: applied (not recorded in the ledger; the next db:schema:migrate records it)`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exit(1);
});
