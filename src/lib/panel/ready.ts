import type { NextResponse } from "next/server";
import { getDb } from "../db";
import { bad } from "../admin/langganan-api";
import type { Kysely } from "kysely";
import type { Database } from "../db/types";

/** False when migration 032 has not been run on this database (the panel tables do not exist). */
export async function panelReady(db: Kysely<Database>): Promise<boolean> {
  try {
    await db.selectFrom("panel_snapshots").select("id").limit(1).execute();
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return false;
    throw error;
  }
}

export const NOT_READY_MESSAGE = "Penilaian AI belum bersedia pada pangkalan data ini: migrasi 032 belum dijalankan.";

/** A 503 answer for the admin API when the tables are not there, otherwise null. */
export async function notReady(): Promise<NextResponse | null> {
  return (await panelReady(getDb())) ? null : bad(NOT_READY_MESSAGE, 503);
}
