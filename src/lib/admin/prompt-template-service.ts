/**
 * Admin Prompt Template Service
 *
 * Database operations for managing prompt templates in admin console.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database, WorkType, PromptStatus } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[PromptTemplateService] Database not available.");
  }
  return getDb();
}

export interface PromptTemplateInput {
  name: string;
  promptText: string;
  scope: string;
  workType?: string;
  workId?: string;
  version?: number;
  status?: string;
}

export interface PromptTemplateRecord {
  id: number;
  name: string;
  prompt_text: string;
  scope: string;
  work_type: string | null;
  work_id: string | null;
  version: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function listPromptTemplates(): Promise<PromptTemplateRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("prompt_templates")
    .orderBy("created_at", "desc")
    .selectAll()
    .execute();
}

export async function getPromptTemplate(id: number): Promise<PromptTemplateRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("prompt_templates")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createPromptTemplate(input: PromptTemplateInput): Promise<PromptTemplateRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const result = await db
    .insertInto("prompt_templates")
    .values({
      name: input.name,
      prompt_text: input.promptText,
      scope: input.scope || "global",
      work_type: (input.workType || null) as WorkType | null,
      work_id: input.workId || null,
      version: input.version || 1,
      status: (input.status || "active") as PromptStatus,
      created_at: now,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta prompt template.");
  }

  const template = await getPromptTemplate(result.id);
  if (!template) {
    throw new Error("Prompt template tidak ditemui selepas penciptaan.");
  }

  return template;
}

export async function updatePromptTemplate(
  id: number,
  input: Partial<PromptTemplateInput>
): Promise<PromptTemplateRecord> {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (input.name !== undefined) updateData.name = input.name;
  if (input.promptText !== undefined) updateData.prompt_text = input.promptText;
  if (input.scope !== undefined) updateData.scope = input.scope;
  if (input.workType !== undefined) updateData.work_type = input.workType || null;
  if (input.workId !== undefined) updateData.work_id = input.workId || null;
  if (input.version !== undefined) updateData.version = input.version;
  if (input.status !== undefined) updateData.status = input.status;
  updateData.updated_at = now;

  await db
    .updateTable("prompt_templates")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const template = await getPromptTemplate(id);
  if (!template) {
    throw new Error("Prompt template tidak ditemui selepas kemas kini.");
  }

  return template;
}

export async function deletePromptTemplate(id: number): Promise<void> {
  const db = getAdminDb();
  await db
    .deleteFrom("prompt_templates")
    .where("id", "=", id)
    .execute();
}
