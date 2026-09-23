/**
 * Prompt composition for generation requests.
 *
 * Composes prompts from multiple layers:
 * 1. Active global editorial prompt
 * 2. Work-type/category prompt
 * 3. Optional submission-specific override
 * 4. Submission brief / requested concept
 *
 * Prompt version/provenance is preserved — never silently mutated.
 */

import type { Kysely } from "kysely";
import type { Database, WorkType } from "../../db/types";

export interface ComposedPrompt {
  systemPrompt: string;
  userPrompt: string;
  templateIds: number[];
  templateNames: string[];
  templateVersions: number[];
}

/**
 * Resolve active prompt templates for a given work type.
 * Returns templates ordered: global first, then work-type specific.
 */
export async function resolvePromptTemplates(
  db: Kysely<Database>,
  workType: WorkType | null,
  overrideTemplateId?: number
): Promise<{ id: number; name: string; prompt_text: string; scope: string; version: number }[]> {
  const templates: { id: number; name: string; prompt_text: string; scope: string; version: number }[] = [];

  if (overrideTemplateId) {
    const override = await db
      .selectFrom("prompt_templates")
      .where("id", "=", overrideTemplateId)
      .where("status", "=", "active")
      .select(["id", "name", "prompt_text", "scope", "version"])
      .executeTakeFirst();

    if (override) {
      return [override];
    }
  }

  // 1. Active global prompts
  const globalTemplates = await db
    .selectFrom("prompt_templates")
    .where("scope", "=", "global")
    .where("status", "=", "active")
    .orderBy("version", "desc")
    .select(["id", "name", "prompt_text", "scope", "version"])
    .execute();

  templates.push(...globalTemplates);

  // 2. Work-type specific prompts
  if (workType) {
    const typeTemplates = await db
      .selectFrom("prompt_templates")
      .where("scope", "=", "per-type")
      .where("work_type", "=", workType)
      .where("status", "=", "active")
      .orderBy("version", "desc")
      .select(["id", "name", "prompt_text", "scope", "version"])
      .execute();

    templates.push(...typeTemplates);
  }

  return templates;
}

/**
 * Compose final prompts from resolved templates and submission brief.
 */
export function composePrompts(
  templates: { id: number; name: string; prompt_text: string; scope: string; version: number }[],
  submissionBrief: string,
  submissionTitle?: string | null
): ComposedPrompt {
  const systemParts: string[] = [];
  const templateIds: number[] = [];
  const templateNames: string[] = [];
  const templateVersions: number[] = [];

  for (const template of templates) {
    systemParts.push(template.prompt_text);
    templateIds.push(template.id);
    templateNames.push(template.name);
    templateVersions.push(template.version);
  }

  const systemPrompt = systemParts.join("\n\n---\n\n");

  const userParts: string[] = [];
  if (submissionTitle) {
    userParts.push(`Tajuk: ${submissionTitle}`);
  }
  userParts.push(`Arahan/Brief:\n${submissionBrief}`);

  const userPrompt = userParts.join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    templateIds,
    templateNames,
    templateVersions,
  };
}

/**
 * Format composed prompt for preview (admin UI display).
 */
export function formatComposedPromptPreview(composed: ComposedPrompt): string {
  const parts: string[] = [];

  parts.push("=== PROMPT PROVENANCE ===");
  parts.push(`Templates: ${composed.templateNames.join(", ")}`);
  parts.push(`IDs: ${composed.templateIds.join(", ")}`);
  parts.push(`Versions: ${composed.templateVersions.join(", ")}`);
  parts.push("");
  parts.push("=== SYSTEM PROMPT ===");
  parts.push(composed.systemPrompt);
  parts.push("");
  parts.push("=== USER PROMPT ===");
  parts.push(composed.userPrompt);

  return parts.join("\n");
}
