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

/** A temporary username and password that nobody has used to sign in stop working after this many days (a new one can be sent). */
export const INVITE_VALID_DAYS = 7;
/** The name of an account whose owner did not give one: the person types their own at the first sign-in. */
export const DEFAULT_DISPLAY_NAME = "Pengguna baharu";

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
  /** While the temporary password has not been used: when it stops working. null once the person has signed in. */
  inviteExpiresAt: string | null;
}

/** The moment an unused invitation stops working, or null when it is not an unused invitation. Counted from the owner's last change to the account (a new password, a changed role). */
export function inviteExpiry(row: { mustChangePassword: boolean; lastLoginAt: string | null; updatedAt: string | null }): Date | null {
  if (!row.mustChangePassword || row.lastLoginAt || !row.updatedAt) return null;
  const from = new Date(row.updatedAt).getTime();
  return Number.isFinite(from) ? new Date(from + INVITE_VALID_DAYS * 86_400_000) : null;
}

export function inviteExpired(row: { mustChangePassword: boolean; lastLoginAt: string | null; updatedAt: string | null }, now: number = Date.now()): boolean {
  const end = inviteExpiry(row);
  return end !== null && end.getTime() < now;
}

// No 0/o, 1/l/i: the username is typed from a message too.
const USERNAME_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** "jalin-k7m2x": readable, easy to type, and never a real person's name. */
export function generateTempUsername(): string {
  return `jalin-${Array.from({ length: 5 }, () => USERNAME_ALPHABET[crypto.randomInt(USERNAME_ALPHABET.length)]!).join("")}`;
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
  updated_at?: Date | string | null;
};

function toUser(row: UserRow): StaffUser {
  const mustChangePassword = Boolean(row.must_change_password);
  const lastLoginAt = iso(row.last_login_at);
  return {
    id: String(row.id),
    username: String(row.username),
    email: row.email ?? null,
    displayName: String(row.display_name),
    role: row.role,
    active: Boolean(row.active),
    mustChangePassword,
    lastLoginAt,
    createdAt: iso(row.created_at) ?? "",
    inviteExpiresAt: inviteExpiry({ mustChangePassword, lastLoginAt, updatedAt: iso(row.updated_at) })?.toISOString() ?? null
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

/**
 * Creates the account and returns it with the temporary password: this is the only time the password exists in the clear.
 * Only the role is needed. With no username one is made ("jalin-k7m2x"); with no name the note is "Pengguna baharu": the person types
 * their own name and may choose a lasting username when they sign in the first time. A name given here is the owner's own label.
 */
export async function createStaff(
  input: { username?: unknown; displayName?: unknown; email?: unknown; role: unknown },
  createdBy: string
): Promise<{ user: StaffUser; tempPassword: string }> {
  const given = typeof input.username === "string" && input.username.trim() !== "";
  const displayName = typeof input.displayName === "string" && input.displayName.trim() ? input.displayName.trim() : DEFAULT_DISPLAY_NAME;
  if (displayName.length > 80) throw new UserInputError("Nama diperlukan (paling panjang 80 aksara).");
  if (!isStaffRole(input.role)) throw new UserInputError("Peranan tidak sah.");
  const email = typeof input.email === "string" && input.email.trim() ? input.email.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserInputError("E-mel tidak sah.");
  const fixedUsername = given ? cleanUsername(input.username) : null;

  const tempPassword = generateTempPassword();
  // A made-up username can collide with an existing one (rarely): try a few new ones. A username the owner typed never changes.
  for (let attempt = 0; attempt < (fixedUsername ? 1 : 8); attempt++) {
    const id = crypto.randomUUID();
    try {
      await db().insertInto("admin_users").values({
        id, username: fixedUsername ?? generateTempUsername(), email, display_name: displayName, role: input.role,
        password_hash: hashPassword(tempPassword), created_by: createdBy
      }).execute();
      return { user: (await getStaff(id))!, tempPassword };
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
      if (fixedUsername || email) throw new UserInputError("Nama pengguna atau e-mel ini sudah digunakan.");
    }
  }
  throw new UserInputError("Nama pengguna sementara tidak dapat dibuat. Cuba lagi.");
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

export type SignInResult = { ok: true; user: StaffUser } | { ok: false; reason: "invalid" | "locked" | "inactive" | "expired" };

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
  // A temporary password nobody used within a week no longer opens the door (the right password, so no failed attempt is counted).
  const user = toUser(row);
  if (inviteExpired({ mustChangePassword: user.mustChangePassword, lastLoginAt: user.lastLoginAt, updatedAt: iso(row.updated_at) })) return { ok: false, reason: "expired" };
  await db().updateTable("admin_users").set({ failed_attempts: 0, locked_until: null, last_login_at: new Date() }).where("id", "=", row.id).execute();
  return { ok: true, user };
}

/**
 * The person chooses their own password. At the first sign-in (the temporary password still in force) they also give their own name and may
 * keep the temporary username or choose a lasting one, and may add an e-mail; those are ignored on any later password change.
 */
export async function changeOwnPassword(
  id: string,
  current: string,
  next: string,
  profile?: { username?: unknown; displayName?: unknown; email?: unknown }
): Promise<void> {
  const row = await db().selectFrom("admin_users").where("id", "=", id).selectAll().executeTakeFirst();
  if (!row || !row.active) throw new UserInputError("Akaun tidak ditemui.");
  if (!verifyPassword(current, row.password_hash)) throw new UserInputError("Kata laluan semasa tidak betul.");

  const set: Record<string, unknown> = {};
  let username = row.username;
  if (row.must_change_password && profile) {
    if (profile.displayName !== undefined) {
      const name = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
      if (!name || name.length > 80) throw new UserInputError("Nama anda diperlukan (paling panjang 80 aksara).");
      set.display_name = name;
    }
    if (typeof profile.username === "string" && profile.username.trim() !== "") {
      username = cleanUsername(profile.username);
      set.username = username;
    }
    if (typeof profile.email === "string" && profile.email.trim() !== "") {
      const email = profile.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserInputError("E-mel tidak sah.");
      set.email = email;
    }
  }
  const problem = passwordProblem(next, username);
  if (problem) throw new UserInputError(problem);
  if (verifyPassword(next, row.password_hash)) throw new UserInputError("Pilih kata laluan yang berbeza daripada yang sementara.");
  try {
    await db().updateTable("admin_users")
      .set({ ...set, password_hash: hashPassword(next), must_change_password: false, password_changed_at: new Date(), updated_at: new Date() } as never)
      .where("id", "=", id).execute();
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new UserInputError("Nama pengguna atau e-mel ini sudah digunakan. Pilih yang lain.");
    throw error;
  }
}

/**
 * The invitation the owner copies and sends by WhatsApp, e-mail or any message: the address, the temporary username and password, and what
 * the person may do after signing in. The username and password are filled in; nothing else needs typing.
 */
export function invitationText(user: Pick<StaffUser, "username" | "role">, tempPassword: string, origin: string): string {
  return [
    "Assalamualaikum warahmatullah wabarakatuh.",
    "",
    `Anda terpilih untuk menyertai Jalin sebagai ${ROLE_NAMES[user.role].toLowerCase()}.`,
    "",
    `Log masuk di: ${origin}/admin/login`,
    `Kata nama sementara: ${user.username}`,
    `Kata laluan sementara: ${tempPassword}`,
    "",
    `Anda boleh menukar kata nama dan kata laluan kekal selepas mendaftar masuk. Jemputan ini sah selama ${INVITE_VALID_DAYS} hari dan untuk anda sahaja; jangan kongsikannya.`
  ].join("\n");
}
