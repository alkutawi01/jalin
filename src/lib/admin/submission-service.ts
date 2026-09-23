/**
 * Admin Submission Service
 *
 * Database operations for managing work submissions in admin console.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database, WorkType, SubmissionStatus, SubmitterType } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[SubmissionService] Database not available.");
  }
  return getDb();
}

export interface SubmissionInput {
  proposedType?: string;
  proposedTitle?: string;
  proposedSlug?: string;
  manuscript?: string;
  dek?: string;
  status?: string;
  submitterType: string;
  reviewerNotes?: string;
  resultWorkId?: string;
}

export interface SubmissionRecord {
  id: number;
  proposed_type: string | null;
  proposed_title: string | null;
  proposed_slug: string | null;
  manuscript: string | null;
  dek: string | null;
  status: string;
  submitter_type: string;
  created_at: Date;
  updated_at: Date;
  reviewed_at: Date | null;
  reviewer_notes: string | null;
  result_work_id: string | null;
}

export async function listSubmissions(): Promise<SubmissionRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("work_submissions")
    .orderBy("created_at", "desc")
    .selectAll()
    .execute();
}

export async function getSubmission(id: number): Promise<SubmissionRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("work_submissions")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createSubmission(input: SubmissionInput): Promise<SubmissionRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const result = await db
    .insertInto("work_submissions")
    .values({
      proposed_type: (input.proposedType || null) as WorkType | null,
      proposed_title: input.proposedTitle || null,
      proposed_slug: input.proposedSlug || null,
      manuscript: input.manuscript || null,
      dek: input.dek || null,
      status: (input.status || "draft") as SubmissionStatus,
      submitter_type: input.submitterType as SubmitterType,
      reviewer_notes: input.reviewerNotes || null,
      result_work_id: input.resultWorkId || null,
      created_at: now,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta submission.");
  }

  const submission = await getSubmission(result.id);
  if (!submission) {
    throw new Error("Submission tidak ditemui selepas penciptaan.");
  }

  return submission;
}

export async function updateSubmission(
  id: number,
  input: Partial<SubmissionInput>
): Promise<SubmissionRecord> {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (input.proposedType !== undefined) updateData.proposed_type = input.proposedType || null;
  if (input.proposedTitle !== undefined) updateData.proposed_title = input.proposedTitle || null;
  if (input.proposedSlug !== undefined) updateData.proposed_slug = input.proposedSlug || null;
  if (input.manuscript !== undefined) updateData.manuscript = input.manuscript || null;
  if (input.dek !== undefined) updateData.dek = input.dek || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.reviewerNotes !== undefined) updateData.reviewer_notes = input.reviewerNotes || null;
  if (input.resultWorkId !== undefined) updateData.result_work_id = input.resultWorkId || null;
  updateData.updated_at = now;

  if (input.status === "approved" || input.status === "rejected" || input.status === "under_review") {
    updateData.reviewed_at = now;
  }

  await db
    .updateTable("work_submissions")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const submission = await getSubmission(id);
  if (!submission) {
    throw new Error("Submission tidak ditemui selepas kemas kini.");
  }

  return submission;
}

export async function deleteSubmission(id: number): Promise<void> {
  const db = getAdminDb();

  await db
    .deleteFrom("submission_contributions")
    .where("submission_id", "=", id)
    .execute();

  await db
    .deleteFrom("work_submissions")
    .where("id", "=", id)
    .execute();
}
