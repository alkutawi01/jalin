import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Staff accounts (RBAC). The owner is not a row: the owner signs in with ADMIN_SECRET and the allowed e-mail list, as before.
 * Rows are chief editors and editors, each with their own username and password.
 *
 * Additive: one new table, nothing else is touched. Idempotent (IF NOT EXISTS).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id text PRIMARY KEY,
      username text NOT NULL,
      email text,
      display_name text NOT NULL,
      role text NOT NULL CHECK (role IN ('chief_editor', 'editor')),
      password_hash text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      active boolean NOT NULL DEFAULT true,
      failed_attempts integer NOT NULL DEFAULT 0,
      locked_until timestamptz,
      last_login_at timestamptz,
      password_changed_at timestamptz,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_lower ON admin_users (lower(username))`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower ON admin_users (lower(email)) WHERE email IS NOT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS admin_users`.execute(db);
}
