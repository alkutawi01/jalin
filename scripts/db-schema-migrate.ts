import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import fs from "node:fs";
import path from "node:path";
import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { Pool } from "pg";
import {
  databaseSslEnabled,
  requireMigrationDatabaseUrl,
} from "../src/lib/db/env";
import type { Database } from "../src/lib/db/types";

let databaseUrl: string;
try {
  databaseUrl = requireMigrationDatabaseUrl();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid migration environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseSslEnabled() ? { rejectUnauthorized: false } : false,
  max: 1,
});

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

const MIGRATIONS_DIR = path.join(__dirname, "..", "src", "lib", "db", "migrations");
const MIGRATION_NAME = /^\d{3}_[a-z0-9_]+$/;

type MigrationFunc = (db: Kysely<any>) => Promise<void>;

type LoadedMigration = {
  up?: MigrationFunc;
  down?: MigrationFunc;
};

type MigrationEntry = {
  up: MigrationFunc;
  down?: MigrationFunc;
};

async function loadMigrationsFromFiles(): Promise<Record<string, MigrationEntry>> {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const migrations: Record<string, MigrationEntry> = {};

  for (const file of files) {
    const name = file.replace(/\.(ts|js)$/, "");
    if (!MIGRATION_NAME.test(name)) {
      throw new Error(`Migration file name must match NNN_snake_case: ${file}`);
    }
    const loaded = require(path.join(MIGRATIONS_DIR, file)) as LoadedMigration;
    if (typeof loaded.up !== "function") {
      throw new Error(`Migration ${file} must export up(db).`);
    }
    migrations[name] =
      typeof loaded.down === "function"
        ? { up: loaded.up, down: loaded.down }
        : { up: loaded.up };
  }

  return migrations;
}

const migrator = new Migrator({
  db,
  provider: {
    async getMigrations() {
      return loadMigrationsFromFiles();
    },
  },
});

async function main() {
  console.log("Running schema migrations...\n");

  try {
    const { results, error } = await migrator.migrateToLatest();

    if (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined;
      console.error(`Migration failed${code ? ` (code ${code})` : ""}.`);
      process.exitCode = 1;
      return;
    }

    if (results) {
      for (const result of results) {
        console.log(`${result.status === "Success" ? "✓" : "✗"} ${result.migrationName}: ${result.status}`);
      }
    }

    console.log("\nSchema migrations complete.");
  } finally {
    await db.destroy();
  }
}

void main();
