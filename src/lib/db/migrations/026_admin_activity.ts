import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Who did what in the admin (RBAC, part 3): one row per change an editor, chief editor or the owner makes to credits, works,
 * sections and pictures, with the person, their role, what was done and a one-line summary.
 *
 * Additive: one new table, nothing else is touched. Idempotent (IF NOT EXISTS). Rows only start from the day recording is switched on.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_activity (
      id bigserial PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      actor_id text NOT NULL,
      actor_name text NOT NULL,
      actor_role text NOT NULL,
      action text NOT NULL,
      subject_type text NOT NULL,
      subject_id text,
      work_id text,
      summary text NOT NULL
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS admin_activity_at ON admin_activity (at DESC, id DESC)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS admin_activity_actor ON admin_activity (actor_id, at DESC)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS admin_activity_work ON admin_activity (work_id, at DESC) WHERE work_id IS NOT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS admin_activity`.execute(db);
}
