/**
 * Who did what in the admin (table admin_activity, migration 026). One row for each change to credits, works, sections and pictures:
 * the person, their role, what was done, which work, and a one-line summary.
 *
 * Recording never gets in the way: if the table is missing or the database is slow, the change itself still succeeds and the failure is
 * only logged. Only the owner and the chief editor read the list (permissions.ts).
 */

import { sql } from "kysely";
import { getDb, hasDb } from "../db";
import { getCurrentAdmin } from "./auth";
import { roleFromClaim, type Role } from "./permissions";

/** What each action is called on the Aktiviti page. */
export const ACTIVITY_ACTIONS = {
  "credit.create": "Menambah kredit",
  "credit.update": "Mengubah kredit",
  "credit.delete": "Membuang kredit",
  "credit.reorder": "Menyusun semula kredit",
  "work.create": "Mencipta karya",
  "work.update": "Menyimpan karya",
  "work.delete": "Memadam draf",
  "section.create": "Menambah bahagian",
  "section.update": "Menyunting bahagian",
  "section.delete": "Membuang bahagian",
  "visual.upload": "Memuat naik gambar",
  "visual.replace": "Menukar gambar",
  "subscription.batch.create": "Membuat kelompok kod kad",
  "subscription.batch.update": "Mengurus kelompok kod kad",
  "subscription.code.revoke": "Membatalkan kod kad",
  "subscription.shared.create": "Membuat kod kongsi",
  "subscription.shared.update": "Mengurus kod kongsi",
  "subscription.access.grant": "Memberi akses kepada pembaca",
  "subscription.access.revoke": "Membatalkan akses pembaca",
  "subscription.switch": "Suis henti penebusan",
  "panel.snapshot": "Menyediakan penilaian panel",
  "panel.rate": "Menambah penilaian panel",
  "panel.rate.invalid": "Jawapan panel ditolak",
  "panel.void": "Membatalkan penilaian panel",
  "panel.settings": "Mengubah tetapan Panel Bacaan AI"
} as const;
export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;

export interface ActivityEntry {
  action: ActivityAction;
  /** "credit", "work", "section" or "visual". */
  subjectType: string;
  subjectId?: string | number | null;
  workId?: string | null;
  /** One sentence, e.g. "Rafiq Naim sebagai Penulis". */
  summary: string;
  /** For edits that are saved again and again: the same person saving the same thing within COLLAPSE_MINUTES updates the last row instead of adding one. */
  collapse?: boolean;
}

export const COLLAPSE_MINUTES = 10;

const FIELD_LABELS: Record<string, string> = {
  title: "tajuk", slug: "alamat pautan", status: "status", body: "teks", genre: "genre", audience: "audiens", dek: "dek",
  readingMinutes: "minit bacaan", publishedAt: "tarikh terbit", editorNote: "nota editor", readerNote: "nota pembaca", origin: "asal"
};

/** "Anak Qasab: tajuk, dek" (the fields the save carried; a save with none says so). */
export function workSaveSummary(title: unknown, body: Record<string, unknown> | null | undefined): string {
  const fields = Object.keys(FIELD_LABELS).filter((key) => body && body[key] !== undefined).map((key) => FIELD_LABELS[key]);
  const name = cleanSummary(title) || "Tanpa tajuk";
  return fields.length > 0 ? `${name}: ${fields.join(", ")}` : name;
}

export interface ActivityRow {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  actionLabel: string;
  subjectType: string;
  subjectId: string | null;
  workId: string | null;
  summary: string;
}

const MAX_SUMMARY = 300;

/** One line, no stray spaces, never longer than the column is meant to hold. */
export function cleanSummary(text: unknown): string {
  const one = String(text ?? "").replace(/\s+/g, " ").trim();
  return one.length > MAX_SUMMARY ? `${one.slice(0, MAX_SUMMARY - 1)}…` : one;
}

/** "Rafiq Naim sebagai Penulis" (the name of the person or guest and the role of the credit). */
export function creditSummary(who: unknown, role: unknown): string {
  return `${cleanSummary(who) || "Tanpa nama"} sebagai ${cleanSummary(role) || "tanpa peranan"}`;
}

/** Record a change made by whoever is signed in. Never throws and never blocks the change. */
export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    if (!hasDb()) return;
    const admin = await getCurrentAdmin();
    if (!admin) return;
    const role = roleFromClaim(admin.role) ?? "owner";
    const db = getDb();
    const subjectId = entry.subjectId === undefined || entry.subjectId === null ? null : String(entry.subjectId);
    const workId = entry.workId ?? null;
    const summary = cleanSummary(entry.summary);
    if (entry.collapse) {
      const recent = await db
        .selectFrom("admin_activity")
        .select("id")
        .where("actor_id", "=", admin.id)
        .where("action", "=", entry.action)
        .where(sql<boolean>`subject_id IS NOT DISTINCT FROM ${subjectId}`)
        .where(sql<boolean>`work_id IS NOT DISTINCT FROM ${workId}`)
        .where(sql<boolean>`at > now() - (${COLLAPSE_MINUTES} * interval '1 minute')`)
        .orderBy("id", "desc")
        .executeTakeFirst();
      if (recent) {
        await db.updateTable("admin_activity").set({ at: sql`now()`, summary }).where("id", "=", recent.id).execute();
        return;
      }
    }
    await db
      .insertInto("admin_activity")
      .values({
        actor_id: admin.id,
        actor_name: cleanSummary(admin.name || admin.email || admin.id).slice(0, 120),
        actor_role: role,
        action: entry.action,
        subject_type: entry.subjectType,
        subject_id: subjectId,
        work_id: workId,
        summary
      })
      .execute();
  } catch (error) {
    console.error("[Activity] Not recorded:", error instanceof Error ? error.message : error);
  }
}

export interface ActivityFilter {
  actorId?: string;
  workId?: string;
  limit?: number;
}

export const ACTIVITY_PAGE_SIZE = 100;

/** The newest changes first. Throws when the table is missing (the page shows that). */
export async function listActivity(filter: ActivityFilter = {}): Promise<ActivityRow[]> {
  let query = getDb().selectFrom("admin_activity").selectAll().orderBy("at", "desc").orderBy("id", "desc");
  if (filter.actorId) query = query.where("actor_id", "=", filter.actorId);
  if (filter.workId) query = query.where("work_id", "=", filter.workId);
  const rows = await query.limit(Math.min(Math.max(filter.limit ?? ACTIVITY_PAGE_SIZE, 1), 500)).execute();
  return rows.map((row) => ({
    id: String(row.id),
    at: new Date(row.at).toISOString(),
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: roleFromClaim(row.actor_role) ?? "editor",
    action: row.action,
    actionLabel: (ACTIVITY_ACTIONS as Record<string, string>)[row.action] ?? row.action,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    workId: row.work_id,
    summary: row.summary
  }));
}

/** The people who appear in the list, for the filter (name and id, each once). */
export async function listActors(): Promise<{ id: string; name: string }[]> {
  const rows = await getDb()
    .selectFrom("admin_activity")
    .select(["actor_id", sql<string>`max(actor_name)`.as("actor_name")])
    .groupBy("actor_id")
    .orderBy("actor_name")
    .execute();
  return rows.map((row) => ({ id: row.actor_id, name: row.actor_name }));
}
