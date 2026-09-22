import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

const DATABASE_URL = process.env.DATABASE_URL;

function createDb(): Kysely<Database> | null {
  if (!DATABASE_URL) {
    return null;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DATABASE_POOL_SIZE || "5", 10),
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
  return DATABASE_URL !== undefined && DATABASE_URL !== "";
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
