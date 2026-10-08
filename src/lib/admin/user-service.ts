/**
 * Staff accounts: create, list, change role, switch off, reset the password, sign in, change one's own password.
 * The owner has no row here (see migration 025). Every function that changes a row is for the owner only; the permission map and
 * the pages check that, this file only enforces what keeps the data sound (unique username, valid role, lockout after wrong passwords).
 */
import crypto from "node:crypto";
import type { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "./passwords";

export const STAFF_ROLES = ["chief_editor", "editor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const ROLE_NAMES: Record<StaffRole, string> = { chief_editor: "Ketua penyunting", editor: "Penyunting" };

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface StaffUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  role: StaffRole;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export class UserInputError extends Error {}

function db(): Kysely<Database> {
  if (!hasDb()) throw new Error("Pangkalan data tidak tersedia.");
  return getDb();
}

function iso(d: Date | string | null | undefined): string | null {
  return d ? (d instanceof Date ? d.toISOString() : String(d)) : null;
}

type UserRow = {
  id: string; username: string; email: string | null; display_name: string; role: StaffRole;
  active: boolean; must_change_password: boolean; last_login_at: Date | string | null; created_at: Date | string;
};

function toUser(row: UserRow): StaffUser {
  return {
    id: String(row.id),
    username: String(row.username),
    email: row.email ?? null,
    displayName: String(row.display_name),
    role: row.role,
    active: Boolean(row.active),
    mustChangePassword: Boolean(row.must_change_password),
    lastLoginAt: iso(row.last_login_at),
    createdAt: iso(row.created_at) ?? ""
  };
}

export function cleanUsername(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(value)) throw new UserInputError("Nama pengguna tidak sah: 3 hingga 30 aksara, huruf kecil, nombor, titik, sengkang atau garis bawah.");
  return value;
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export async function listStaff(): Promise<StaffUser[]> {
  const rows = await db().selectFrom("admin_users").selectAll().orderBy("created_at", "asc").execute();
  return rows.map(toUser);
}

export async function getStaff(id: string): Promise<StaffUser | undefined> {
  const row = await db().selectFrom("admin_users").where("id", "=", id).selectAll().executeTakeFirst();
  return row ? toUser(row) : undefined;
}

/** Creates the account and returns it with the temporary password: this is the only time the password exists in the clear. */
export async function createStaff(
  input: { username: unknown; displayName: unknown; email?: unknown; role: unknown },
  createdBy: string
): Promise<{ user: StaffUser; tempPassword: string }> {
  const username = cleanUsername(input.username);
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (!displayName || displayName.length > 80) throw new UserInputError("Nama diperlukan (paling panjang 80 aksara).");
  if (!isStaffRole(input.role)) throw new UserInputError("Peranan tidak sah.");
  const email = typeof input.email === "string" && input.email.trim() ? input.email.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserInputError("E-mel tidak sah.");

  const tempPassword = generateTempPassword();
  const id = crypto.randomUUID();
  try {
    await db().insertInto("admin_users").values({
      id, username, email, display_name: displayName, role: input.role,
      password_hash: hashPassword(tempPassword), created_by: createdBy
    }).execute();
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new UserInputError("Nama pengguna atau e-mel ini sudah digunakan.");
    throw error;
  }
  return { user: (await getStaff(id))!, tempPassword };
}

export async function updateStaff(id: string, patch: { role?: unknown; active?: unknown; displayName?: unknown }): Promise<StaffUser> {
  const set: Record<string, unknown> = { updated_at: new Date() };
  if (patch.role !== undefined) {
    if (!isStaffRole(patch.role)) throw new UserInputError("Peranan tidak sah.");
    set.role = patch.role;
  }
  if (patch.active !== undefined) {
    if (typeof patch.active !== "boolean") throw new UserInputError("Status tidak sah.");
    set.active = patch.active;
    if (patch.active) { set.failed_attempts = 0; set.locked_until = null; }
  }
  if (patch.displayName !== undefined) {
    const name = typeof patch.displayName === "string" ? patch.displayName.trim() : "";
    if (!name || name.length > 80) throw new UserInputError("Nama diperlukan (paling panjang 80 aksara).");
    set.display_name = name;
  }
  const row = await db().updateTable("admin_users").set(set as never).where("id", "=", id).returning(["id"]).executeTakeFirst();
  if (!row) throw new UserInputError("Pengguna tidak ditemui.");
  return (await getStaff(id))!;
}

/** A new temporary password; the person must choose their own at the next sign-in. */
export async function resetStaffPassword(id: string): Promise<{ user: StaffUser; tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const row = await db().updateTable("admin_users")
    .set({ password_hash: hashPassword(tempPassword), must_change_password: true, failed_attempts: 0, locked_until: null, updated_at: new Date() })
    .where("id", "=", id).returning(["id"]).executeTakeFirst();
  if (!row) throw new UserInputError("Pengguna tidak ditemui.");
  return { user: (await getStaff(id))!, tempPassword };
}

export type SignInResult = { ok: true; user: StaffUser } | { ok: false; reason: "invalid" | "locked" | "inactive" };

/** Username or e-mail, plus password. Wrong passwords are counted; five in a row lock the account for 15 minutes. */
export async function authenticateStaff(identifier: string, password: string): Promise<SignInResult> {
  const key = identifier.trim().toLowerCase();
  const row = await db().selectFrom("admin_users")
    .where((eb) => eb.or([eb(eb.fn("lower", ["username"]), "=", key), eb(eb.fn("lower", ["email"]), "=", key)]))
    .selectAll().executeTakeFirst();
  if (!row) {
    // Same work as a real check, so that a missing account is not faster to reject.
    verifyPassword(password, hashPassword("padding-only"));
    return { ok: false, reason: "invalid" };
  }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { ok: false, reason: "locked" };
  if (!verifyPassword(password, row.password_hash)) {
    const failed = (row.failed_attempts ?? 0) + 1;
    await db().updateTable("admin_users").set({
      failed_attempts: failed >= MAX_FAILED ? 0 : failed,
      locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
    }).where("id", "=", row.id).execute();
    return { ok: false, reason: "invalid" };
  }
  if (!row.active) return { ok: false, reason: "inactive" };
  await db().updateTable("admin_users").set({ failed_attempts: 0, locked_until: null, last_login_at: new Date() }).where("id", "=", row.id).execute();
  return { ok: true, user: toUser(row) };
}

export async function changeOwnPassword(id: string, current: string, next: string): Promise<void> {
  const row = await db().selectFrom("admin_users").where("id", "=", id).selectAll().executeTakeFirst();
  if (!row || !row.active) throw new UserInputError("Akaun tidak ditemui.");
  if (!verifyPassword(current, row.password_hash)) throw new UserInputError("Kata laluan semasa tidak betul.");
  const problem = passwordProblem(next, row.username);
  if (problem) throw new UserInputError(problem);
  if (verifyPassword(next, row.password_hash)) throw new UserInputError("Pilih kata laluan yang berbeza daripada yang sementara.");
  await db().updateTable("admin_users")
    .set({ password_hash: hashPassword(next), must_change_password: false, password_changed_at: new Date(), updated_at: new Date() })
    .where("id", "=", id).execute();
}

/** The invitation the owner copies and pastes into an e-mail or WhatsApp. */
export function invitationText(user: Pick<StaffUser, "displayName" | "username" | "role">, tempPassword: string, origin: string): string {
  return [
    `Salam ${user.displayName},`,
    "",
    `Anda dijemput menyertai pasukan Jalin sebagai ${ROLE_NAMES[user.role].toLowerCase()}.`,
    "",
    `Log masuk: ${origin}/admin/login`,
    `Nama pengguna: ${user.username}`,
    `Kata laluan sementara: ${tempPassword}`,
    "",
    "Anda akan diminta memilih kata laluan sendiri semasa log masuk kali pertama. Jangan kongsi kata laluan ini."
  ].join("\n");
}
