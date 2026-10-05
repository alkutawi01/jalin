/**
 * One-step visual upload from a work's editor.
 *
 * The editor picks an image, writes the alt text and submits the upload.
 * The authenticated editor's action is recorded as approval. This goes through the
 * same records as every other visual (visual_request -> stored asset ->
 * approval -> attach), so provenance ("manual" + tool name) and the
 * human-approval record are kept. It never publishes the work.
 */

import type { Kysely } from "kysely";
import type { Database, VisualRole } from "../../db/types";
import { applyManualUpload } from "./manual-upload";
import { approveVisualRequest, attachVisualToWork } from "./visual-generation-service";
import { isImageMarker } from "../../reader/image-markers";

const ROLES = new Set<VisualRole>(["hero", "inline", "section"]);

export interface WorkVisualUploadInput {
  workId: string;
  role: string;
  altText: string;
  anchor: string | null;
  place: "before" | "after";
  toolName: string | null;
  bytes: Buffer;
  /** Set when replacing an existing hero, so the one-hero rule does not block it. */
  allowExistingHero?: boolean;
  /** Replacement may reuse the marker already owned by the image being replaced. */
  replaceVisualId?: number;
  /** A novela chapter. The image then belongs to that chapter: its markers live in the chapter text, not the work's. */
  sectionSlug?: string | null;
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
  const chapterHero = input.role === "section" && Boolean(input.sectionSlug) && !input.anchor?.trim();
  const needsMarker = input.role !== "hero" && !chapterHero;
  if (needsMarker && !input.anchor?.trim()) {
    return { ok: false, status: 400, error: "Imej dalam teks memerlukan penanda yang wujud dalam karya." };
  }
  const work = await db.selectFrom("works").where("id", "=", input.workId).select(["id", "body"]).executeTakeFirst();
  if (!work) return { ok: false, status: 404, error: "Karya tidak ditemui." };
  // Where the marker has to be found: the chapter's text for a chapter image, otherwise the work's manuscript.
  let textBody = work.body ?? "";
  if (input.sectionSlug) {
    const section = await db.selectFrom("reading_sections").where("work_id", "=", input.workId).where("slug", "=", input.sectionSlug).select("body").executeTakeFirst();
    if (!section) return { ok: false, status: 404, error: "Bab tidak ditemui." };
    textBody = section.body ?? "";
  }
  if (needsMarker && !textBody.includes(input.anchor!.trim())) {
    return { ok: false, status: 400, error: "Penanda gambar tidak ditemui dalam manuskrip tersimpan. Simpan manuskrip dahulu, kemudian cuba lagi." };
  }
  if (needsMarker && isImageMarker(input.anchor)) {
    const marker = input.anchor!.trim();
    if (textBody.split(marker).length !== 2) {
      return { ok: false, status: 400, error: input.sectionSlug ? "Penanda gambar mesti muncul tepat sekali dalam teks bab itu." : "Penanda gambar mesti muncul tepat sekali dalam manuskrip." };
    }
    let assignedQuery = db.selectFrom("visuals").where("work_id", "=", input.workId).where("anchor", "=", marker);
    if (input.sectionSlug) assignedQuery = assignedQuery.where("section_slug" as never, "=", input.sectionSlug as never);
    const assigned = await assignedQuery.select("id").executeTakeFirst();
    if (assigned && assigned.id !== input.replaceVisualId) return { ok: false, status: 409, error: "Penanda ini sudah digunakan oleh gambar lain." };
  }

  if (input.role === "hero" && !input.allowExistingHero) {
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

  if (chapterHero && !input.replaceVisualId) {
    const existing = await db.selectFrom("visuals").where("work_id", "=", input.workId).where("role", "=", "section")
      .where("section_slug" as never, "=", input.sectionSlug as never).select("id").executeTakeFirst().catch(() => undefined);
    if (existing) return { ok: false, status: 409, error: "Bab ini sudah mempunyai hero. Ganti atau padam yang lama dahulu." };
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
      anchor: input.role === "hero" || chapterHero ? null : input.anchor,
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

  if (input.sectionSlug) {
    try {
      await db.updateTable("visuals").set({ section_slug: input.sectionSlug } as never).where("id", "=", attach.visualId).execute();
    } catch {
      // Without migration 022 the chapter cannot be recorded; do not leave an image that would show on the whole work.
      await db.deleteFrom("visuals").where("id", "=", attach.visualId).execute();
      return { ok: false, status: 409, error: "Gambar bab memerlukan migration 022 pada pangkalan data. Hubungi pentadbir untuk menjalankannya.", visualRequestId: created.id };
    }
  }

  return { ok: true, visualRequestId: created.id, visualId: attach.visualId, assetPath: upload.assetPath };
}

/**
 * The last step of a replacement: the new visual takes the old one's order and crop, and the old one is deleted, in one transaction that
 * first locks the old row. Two replacements of the same picture at once (a double click) would otherwise both attach a new visual and both
 * delete the old, leaving two pictures in one place; the one that finds the old row already gone removes its own new visual and returns false.
 */
export async function swapReplacedVisual(
  db: Kysely<Database>,
  old: { id: number; work_id: string; sort_order: number },
  newVisualId: number
): Promise<boolean> {
  return db.transaction().execute(async (trx) => {
    const stillThere = await trx.selectFrom("visuals").where("id", "=", old.id).where("work_id", "=", old.work_id).selectAll().forUpdate().executeTakeFirst();
    if (!stillThere) {
      await trx.deleteFrom("visuals").where("id", "=", newVisualId).execute();
      return false;
    }
    const keep = stillThere as { focus_x?: number | null; focus_y?: number | null; zoom?: number | null };
    const crop = keep.focus_x != null || keep.focus_y != null || keep.zoom != null
      ? { focus_x: keep.focus_x ?? null, focus_y: keep.focus_y ?? null, zoom: keep.zoom ?? null }
      : {};
    // The crop belongs to the place the image has, so a replacement starts with the same crop.
    await trx.updateTable("visuals").set({ sort_order: old.sort_order, ...crop } as never).where("id", "=", newVisualId).execute();
    await trx.deleteFrom("visuals").where("id", "=", old.id).where("work_id", "=", old.work_id).execute();
    return true;
  });
}

export type ReplaceVisualResult =
  | { ok: true; visualId: number; assetPath: string }
  | { ok: false; status: number; error: string };

/**
 * Replaces the image of a visual that is already attached to a work. The role,
 * anchor, placement, alt text and order are kept; the new image goes through the
 * same request -> approval -> attach records as any upload, then the old visual
 * row is removed. Earlier visual requests stay as history.
 */
export async function replaceVisualImage(
  db: Kysely<Database>,
  input: { visualId: number; bytes: Buffer; toolName: string | null; altText?: string; actor: string }
): Promise<ReplaceVisualResult> {
  const old = await db.selectFrom("visuals").where("id", "=", input.visualId).selectAll().executeTakeFirst();
  if (!old) return { ok: false, status: 404, error: "Visual tidak ditemui." };

  const result = await uploadVisualForWork(db, {
    workId: old.work_id,
    role: old.role,
    altText: (input.altText ?? "").trim() || old.alt || "",
    anchor: old.anchor ?? null,
    place: old.place === "before" ? "before" : "after",
    toolName: input.toolName,
    bytes: input.bytes,
    actor: input.actor,
    allowExistingHero: true,
    replaceVisualId: input.visualId,
    sectionSlug: (old as { section_slug?: string | null }).section_slug ?? null
  });
  if (!result.ok) return { ok: false, status: result.status, error: result.error };

  const swapped = await swapReplacedVisual(db, old, result.visualId);
  if (!swapped) {
    return { ok: false, status: 409, error: "Gambar ini sudah diganti oleh permintaan lain. Muat semula halaman untuk melihat gambar semasa." };
  }
  return { ok: true, visualId: result.visualId, assetPath: result.assetPath };
}
