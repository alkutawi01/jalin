import fs from "node:fs";
import path from "node:path";
import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { Pool } from "pg";
import { loadMigrationEnvironment } from "./lib/migration-env";
import { migrationConnection, migrationExpectedHost, migrationFailureMessage } from "../src/lib/db/migration-connection";
import type { Database } from "../src/lib/db/types";

let connection: ReturnType<typeof migrationConnection>;
try {
  connection = migrationConnection(
    loadMigrationEnvironment(path.join(__dirname, "..")),
    migrationExpectedHost(process.argv.slice(2)),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid migration environment.");
  process.exit(1);
}

console.log(`Database host: ${connection.host}`);
const pool = new Pool(connection.poolOptions);

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

const MIGRATIONS_DIR = path.join(__dirname, "..", "src", "lib", "db", "migrations");
const MIGRATION_NAME = /^\d{3}_[a-z0-9_]+$/;

type MigrationFunc = (db: Kysely<unknown>) => Promise<void>;

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      console.error(migrationFailureMessage(error));
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

void main().catch((error: unknown) => {
  console.error(migrationFailureMessage(error));
  process.exitCode = 1;
});
