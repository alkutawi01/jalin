/**
 * One-step visual upload from a work's Visual tab.
 *
 * The editor picks an image, writes the alt text and ticks that they have
 * reviewed and approved it. Behind the scenes this still goes through the
 * same records as every other visual (visual_request -> stored asset ->
 * approval -> attach), so provenance ("manual" + tool name) and the
 * human-approval record are kept. It never publishes the work.
 */

import type { Kysely } from "kysely";
import type { Database, VisualRole } from "../../db/types";
import { applyManualUpload } from "./manual-upload";
import { approveVisualRequest, attachVisualToWork } from "./visual-generation-service";

const ROLES = new Set<VisualRole>(["hero", "inline", "section"]);

export interface WorkVisualUploadInput {
  workId: string;
  role: string;
  altText: string;
  anchor: string | null;
  place: "before" | "after";
  toolName: string | null;
  bytes: Buffer;
  /** The editor's explicit "I reviewed and approve this image" tick. */
  approved: boolean;
  actor: string;
}

export type WorkVisualUploadResult =
  | { ok: true; visualRequestId: number; visualId: number; assetPath: string }
  | { ok: false; status: number; error: string; visualRequestId?: number };

export async function uploadVisualForWork(
  db: Kysely<Database>,
  input: WorkVisualUploadInput
): Promise<WorkVisualUploadResult> {
  if (!ROLES.has(input.role as VisualRole)) {
    return { ok: false, status: 400, error: "Role mesti hero, inline atau section." };
  }
  if (!input.altText.trim()) {
    return { ok: false, status: 400, error: "Alt text diperlukan (penerangan gambar untuk pembaca)." };
  }
  if (!input.approved) {
    return {
      ok: false,
      status: 400,
      error: "Sahkan bahawa anda telah menyemak dan meluluskan imej ini sebelum dimuat naik."
    };
  }

  const work = await db.selectFrom("works").where("id", "=", input.workId).select(["id"]).executeTakeFirst();
  if (!work) return { ok: false, status: 404, error: "Karya tidak ditemui." };

  if (input.role === "hero") {
    const existingHero = await db
      .selectFrom("visuals")
      .where("work_id", "=", input.workId)
      .where("role", "=", "hero")
      .select("id")
      .executeTakeFirst();
    if (existingHero) {
      return {
        ok: false,
        status: 409,
        error: "Karya ini sudah mempunyai hero. Padam hero lama di senarai di bawah dahulu, kemudian muat naik yang baharu."
      };
    }
  }

  const now = new Date().toISOString();
  const created = await db
    .insertInto("visual_requests")
    .values({
      work_id: input.workId,
      submission_id: null,
      visual_role: input.role as VisualRole,
      prompt: "Imej dimuat naik oleh editor (manual).",
      provider: "manual",
      provider_request_id: null,
      provider_creation_id: null,
      status: "draft",
      source_asset_url: null,
      source_asset_path: null,
      alt_text: input.altText.trim(),
      anchor: input.role === "inline" ? input.anchor : null,
      place: input.place,
      approval_state: "pending",
      aspect_ratio: input.role === "hero" ? "3:2" : "4:3",
      model: null,
      execution_mode: "magnific_api",
      attempt_history: "[]",
      last_webhook_id: null,
      requested_by: input.actor,
      retry_count: 0,
      asset_finalized: false,
      created_at: now,
      updated_at: now
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  const upload = await applyManualUpload(db, created.id, input.bytes, input.toolName, input.actor);
  if (!upload.ok) {
    // Nothing was stored, so do not leave an empty request behind.
    await db.deleteFrom("visual_requests").where("id", "=", created.id).execute();
    return { ok: false, status: upload.status, error: upload.error };
  }

  const approval = await approveVisualRequest(db, created.id, input.actor);
  if (!approval.success) {
    return {
      ok: false,
      status: 409,
      error: `Imej disimpan tetapi belum diluluskan: ${approval.error}`,
      visualRequestId: created.id
    };
  }

  const attach = await attachVisualToWork(db, created.id);
  if (!attach.success || !attach.visualId) {
    return {
      ok: false,
      status: 409,
      error: `Imej diluluskan tetapi belum dipautkan: ${attach.error ?? "ralat tidak diketahui"}`,
      visualRequestId: created.id
    };
  }

  return { ok: true, visualRequestId: created.id, visualId: attach.visualId, assetPath: upload.assetPath };
}
