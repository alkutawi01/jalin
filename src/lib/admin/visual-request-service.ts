/**
 * Admin Visual Request Service
 *
 * Database operations for managing visual requests in admin console.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database, VisualRole, VisualPlace, VisualRequestStatus } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[VisualRequestService] Database not available.");
  }
  return getDb();
}

export interface VisualRequestInput {
  workId?: string;
  submissionId?: number;
  visualRole: string;
  prompt: string;
  provider: string;
  providerRequestId?: string;
  providerCreationId?: string;
  status?: string;
  sourceAssetUrl?: string;
  sourceAssetPath?: string;
  altText?: string;
  anchor?: string;
  place?: string;
  approvalState?: string;
  aspectRatio?: string;
  model?: string;
}

export interface VisualRequestRecord {
  id: number;
  work_id: string | null;
  submission_id: number | null;
  visual_role: string;
  prompt: string;
  provider: string;
  provider_request_id: string | null;
  provider_creation_id: string | null;
  status: string;
  source_asset_url: string | null;
  source_asset_path: string | null;
  alt_text: string | null;
  anchor: string | null;
  place: string;
  approval_state: string;
  requested_by: string;
  approved_by: string | null;
  error_category: string | null;
  error_message: string | null;
  retry_count: number;
  idempotency_key: string | null;
  aspect_ratio: string;
  model: string | null;
  prompt_composed: string | null;
  asset_width: number | null;
  asset_height: number | null;
  asset_mime_type: string | null;
  asset_finalized: boolean;
  started_at: Date | null;
  completed_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  failed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function listVisualRequests(): Promise<VisualRequestRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("visual_requests")
    .orderBy("created_at", "desc")
    .selectAll()
    .execute();
}

export async function getVisualRequest(id: number): Promise<VisualRequestRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("visual_requests")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createVisualRequest(input: VisualRequestInput): Promise<VisualRequestRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const result = await db
    .insertInto("visual_requests")
    .values({
      work_id: input.workId || null,
      submission_id: input.submissionId || null,
      visual_role: input.visualRole as VisualRole,
      prompt: input.prompt,
      provider: input.provider || "magnific",
      provider_request_id: input.providerRequestId || null,
      provider_creation_id: input.providerCreationId || null,
      status: (input.status || "draft") as VisualRequestStatus,
      source_asset_url: input.sourceAssetUrl || null,
      source_asset_path: input.sourceAssetPath || null,
      alt_text: input.altText || null,
      anchor: input.anchor || null,
      place: (input.place || "after") as VisualPlace,
      approval_state: (input.approvalState || "pending") as "pending" | "approved" | "rejected",
      aspect_ratio: (input.aspectRatio || "3:2") as "1:1" | "3:2" | "2:3" | "16:9" | "9:16" | "4:3" | "3:4",
      model: input.model || null,
      requested_by: "admin",
      retry_count: 0,
      asset_finalized: false,
      created_at: now,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta visual request.");
  }

  const request = await getVisualRequest(result.id);
  if (!request) {
    throw new Error("Visual request tidak ditemui selepas penciptaan.");
  }

  return request;
}

export async function updateVisualRequest(
  id: number,
  input: Partial<VisualRequestInput>
): Promise<VisualRequestRecord> {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (input.workId !== undefined) updateData.work_id = input.workId || null;
  if (input.submissionId !== undefined) updateData.submission_id = input.submissionId || null;
  if (input.visualRole !== undefined) updateData.visual_role = input.visualRole;
  if (input.prompt !== undefined) updateData.prompt = input.prompt;
  if (input.provider !== undefined) updateData.provider = input.provider;
  if (input.providerRequestId !== undefined) updateData.provider_request_id = input.providerRequestId || null;
  if (input.providerCreationId !== undefined) updateData.provider_creation_id = input.providerCreationId || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.sourceAssetUrl !== undefined) updateData.source_asset_url = input.sourceAssetUrl || null;
  if (input.sourceAssetPath !== undefined) updateData.source_asset_path = input.sourceAssetPath || null;
  if (input.altText !== undefined) updateData.alt_text = input.altText || null;
  if (input.anchor !== undefined) updateData.anchor = input.anchor || null;
  if (input.place !== undefined) updateData.place = input.place;
  if (input.approvalState !== undefined) updateData.approval_state = input.approvalState;
  if (input.aspectRatio !== undefined) updateData.aspect_ratio = input.aspectRatio;
  if (input.model !== undefined) updateData.model = input.model || null;
  updateData.updated_at = now;

  await db
    .updateTable("visual_requests")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const request = await getVisualRequest(id);
  if (!request) {
    throw new Error("Visual request tidak ditemui selepas kemas kini.");
  }

  return request;
}

export async function deleteVisualRequest(id: number): Promise<void> {
  const db = getAdminDb();
  await db
    .deleteFrom("visual_requests")
    .where("id", "=", id)
    .execute();
}
