import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";
import {
  databaseSslEnabled,
  getDatabasePoolSize,
  getRuntimeDatabaseUrl,
} from "./env";

function createDb(): Kysely<Database> | null {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSslEnabled() ? { rejectUnauthorized: false } : false,
    max: getDatabasePoolSize(),
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

let dbInstance: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  if (!dbInstance) {
    throw new Error(
      "DATABASE_URL not set. Database not available."
    );
  }
  return dbInstance;
}

export function hasDb(): boolean {
  return getRuntimeDatabaseUrl() !== undefined;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
