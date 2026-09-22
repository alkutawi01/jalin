import * as fs from "node:fs";
import * as path from "node:path";
import type { Kysely } from "kysely";
import type { Database } from "./types";

export interface Migration {
  name: string;
  up: (db: Kysely<Database>) => Promise<void>;
  down: (db: Kysely<Database>) => Promise<void>;
}

export async function runMigrations(
  db: Kysely<Database>,
  direction: "up" | "down" = "up"
): Promise<void> {
  const migrationsDir = path.join(__dirname, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found. Skipping.");
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  if (direction === "up") {
    for (const file of files) {
      const migration = await import(path.join(migrationsDir, file));
      console.log(`Running migration: ${file}`);
      await migration.up(db);
    }
  } else {
    for (const file of files.reverse()) {
      const migration = await import(path.join(migrationsDir, file));
      console.log(`Rolling back migration: ${file}`);
      await migration.down(db);
    }
  }
}

export async function getMigrationStatus(
  db: Kysely<Database>
): Promise<{ hasKyselyMigrations: boolean; hasTables: boolean }> {
  let hasKyselyMigrations = false;
  let hasTables = false;

  try {
    await db
      .selectFrom("pg_catalog.pg_tables" as any)
      .select("tablename")
      .where("tablename", "=", "_kysely_migrations")
      .executeTakeFirst();
    hasKyselyMigrations = true;
  } catch {
    hasKyselyMigrations = false;
  }

  try {
    const result = await db
      .selectFrom("pg_catalog.pg_tables" as any)
      .select("tablename")
      .where("tablename", "=", "works")
      .executeTakeFirst();
    hasTables = result !== undefined;
  } catch {
    hasTables = false;
  }

  return { hasKyselyMigrations, hasTables };
}
