/**
 * Migration inventory tests (Phase 4D-1B).
 *
 * One official migration path only: scripts/db-schema-migrate.ts loads
 * src/lib/db/migrations/*.ts through the Kysely Migrator and the existing
 * _kysely_migrations ledger. There must be no inline duplicate definitions
 * and no second migration runner anywhere in the repository.
 *
 * Every migration file must be tracked in HEAD — production and staging
 * databases must never depend on untracked files. A missing number in the
 * sequence is a hard failure.
 */

import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

const REPO_ROOT = path.join(__dirname, "..");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "src", "lib", "db", "migrations");
const RUNNER_PATH = path.join(REPO_ROOT, "scripts", "db-schema-migrate.ts");
const DEAD_RUNNER_PATH = path.join(REPO_ROOT, "src", "lib", "db", "migrate.ts");

const REQUIRED_MIGRATIONS = [
  "001_create_tables",
  "002_add_credit_public_flag",
  "003_add_contributor_visibility",
  "004_submission_data_model",
  "005_generation_requests",
  "006_add_promoted_at",
  "007_enhance_visual_requests",
  "008_add_visual_asset_finalized",
  "009_visual_execution_hardening",
  "010_add_published_by",
  "011_source_works",
  "012_novela_bersiri_structure",
  "013_living_text_revisions",
  "014_editorial_audit_history",
  "015_editorial_issues",
  "016_editorial_issue_events",
  "017_editorial_roles",
];

function walkTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTypeScriptFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

console.log("migration inventory tests\n");

const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
  .sort();

{
  console.log("inventory");

  const names = migrationFiles.map((file) => file.replace(/\.(ts|js)$/, ""));
  assert(
    names.every((name) => /^\d{3}_[a-z0-9_]+$/.test(name)),
    "every migration file is named NNN_snake_case"
  );

  for (const required of REQUIRED_MIGRATIONS) {
    assert(names.includes(required), `required migration present: ${required}`);
  }

  const numbers = names.map((name) => parseInt(name, 10));
  assert(
    new Set(numbers).size === numbers.length,
    "no duplicate migration numbers"
  );

  const max = Math.max(...numbers);
  const missing: number[] = [];
  for (let n = 1; n <= max; n++) {
    if (!numbers.includes(n)) missing.push(n);
  }
  assert(
    missing.length === 0,
    `no missing migration numbers${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`
  );

  let allUp = true;
  for (const file of migrationFiles) {
    const loaded = require(path.join(MIGRATIONS_DIR, file)) as {
      up?: unknown;
      down?: unknown;
    };
    if (typeof loaded.up !== "function") {
      console.log(`    ✗ ${file}: missing up(db)`);
      allUp = false;
    }
    if (loaded.down !== undefined && typeof loaded.down !== "function") {
      console.log(`    ✗ ${file}: down exists but is not a function`);
      allUp = false;
    }
  }
  assert(allUp, `every migration file exports a working up(db)`);
}

{
  console.log("\nsingle official path");

  const runnerSource = fs.readFileSync(RUNNER_PATH, "utf8");
  assert(
    runnerSource.includes('path.join(__dirname, "..", "src", "lib", "db", "migrations")'),
    "runner loads migrations from src/lib/db/migrations (file source of truth)"
  );
  assert(runnerSource.includes("readdirSync"), "runner scans the migrations directory");
  assert(runnerSource.includes("migrateToLatest"), "runner executes via Kysely Migrator");
  assert(
    !runnerSource.includes("createTable") &&
      !runnerSource.includes("addColumn") &&
      !runnerSource.includes("alterTable"),
    "runner contains no inline migration definitions (no duplicate schema source)"
  );

  assert(
    !fs.existsSync(DEAD_RUNNER_PATH),
    "dead runner src/lib/db/migrate.ts removed (no second execution path)"
  );

  const migratorFiles = [
    ...walkTypeScriptFiles(path.join(REPO_ROOT, "scripts")),
    ...walkTypeScriptFiles(path.join(REPO_ROOT, "src")),
  ].filter((file) => fs.readFileSync(file, "utf8").includes("new Migrator("));
  assert(
    migratorFiles.length === 1 &&
      path.resolve(migratorFiles[0]) === path.resolve(RUNNER_PATH),
    "exactly one Migrator instantiation in the repository (scripts/db-schema-migrate.ts)"
  );
}

{
  console.log("\n001 canonical (file = source of truth)");

  const source = fs.readFileSync(path.join(MIGRATIONS_DIR, "001_create_tables.ts"), "utf8");
  assert(source.includes('"disclosure"'), "001 defines contributors.disclosure");
  assert(source.includes("idx_works_type"), "001 defines idx_works_type");
  assert(source.includes("idx_credits_work"), "001 defines idx_credits_work");
  assert(source.includes("idx_glossary_work"), "001 defines idx_glossary_work");
  assert(
    source.includes('.references("works.id").onDelete("cascade")'),
    "001 keeps credits.work_id ON DELETE CASCADE"
  );
  assert(
    source.includes('"Kamus Dewan Edisi Keempat"'),
    "001 keeps glossary source default"
  );
}

{
  console.log("\n004 canonical (status default must match type contract)");

  const source = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "004_submission_data_model.ts"),
    "utf8"
  );
  const lines = source.split("\n");
  const statusPending = lines.filter(
    (line) => line.includes('"status"') && line.includes('defaultTo("pending")')
  );
  const statusDraft = lines.filter(
    (line) => line.includes('"status"') && line.includes('defaultTo("draft")')
  );
  assert(statusPending.length === 0, "004 has no status column defaulting to pending");
  assert(statusDraft.length >= 1, "004 status columns default to draft");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
