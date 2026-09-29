/**
 * Reads and saves the editable prompt text (Tetapan) in `prompt_templates`.
 *
 *   global rules : scope "parser", name "global",  work_type null
 *   recipe text  : scope "parser", name <mode>,    work_type <kind>
 *
 * Each save inserts a new version and deactivates the earlier ones, so an old
 * wording can be recovered from the table. When there is no database or no
 * saved row, the defaults in default-prompts.ts are used.
 */

import { getDb, hasDb } from "../../db";
import type { WorkType } from "../../db/types";
import { DEFAULT_GLOBAL_RULES, DEFAULT_RECIPE_TEXT } from "./default-prompts";
import { getRecipe, type RecipeKey } from "./recipes";

const SCOPE = "parser";
const GLOBAL_NAME = "global";

export interface StoredPrompts {
  globalRules: string;
  globalCustomised: boolean;
  recipeText: string;
  recipeCustomised: boolean;
}

async function activeText(name: string, workType: string | null): Promise<string | null> {
  if (!hasDb()) return null;
  try {
    let query = getDb()
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .where("status", "=", "active");
    query = workType ? query.where("work_type", "=", workType as WorkType) : query.where("work_type", "is", null);
    const row = await query.orderBy("version", "desc").select("prompt_text").executeTakeFirst();
    return row?.prompt_text?.trim() ? row.prompt_text : null;
  } catch {
    return null;
  }
}

export async function loadPrompts(key: RecipeKey): Promise<StoredPrompts> {
  const recipe = getRecipe(key);
  const [globalText, recipeText] = await Promise.all([
    activeText(GLOBAL_NAME, null),
    activeText(recipe.mode, recipe.kind)
  ]);
  return {
    globalRules: globalText ?? DEFAULT_GLOBAL_RULES,
    globalCustomised: globalText !== null,
    recipeText: recipeText ?? DEFAULT_RECIPE_TEXT[key],
    recipeCustomised: recipeText !== null
  };
}

async function saveVersion(name: string, workType: string | null, text: string): Promise<void> {
  if (!hasDb()) throw new Error("Pangkalan data tidak tersedia. Tetapan tidak dapat disimpan.");
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction().execute(async (trx) => {
    let query = trx.selectFrom("prompt_templates").where("scope", "=", SCOPE).where("name", "=", name);
    query = workType ? query.where("work_type", "=", workType as WorkType) : query.where("work_type", "is", null);
    const latest = await query
      .select((eb) => eb.fn.max("version").as("max"))
      .executeTakeFirst();

    let deactivate = trx
      .updateTable("prompt_templates")
      .set({ status: "inactive", updated_at: now })
      .where("scope", "=", SCOPE)
      .where("name", "=", name);
    deactivate = workType
      ? deactivate.where("work_type", "=", workType as WorkType)
      : deactivate.where("work_type", "is", null);
    await deactivate.execute();

    await trx
      .insertInto("prompt_templates")
      .values({
        name,
        prompt_text: text,
        scope: SCOPE,
        work_type: (workType as WorkType | null) ?? null,
        work_id: null,
        version: Number(latest?.max ?? 0) + 1,
        status: "active",
        created_at: now,
        updated_at: now
      })
      .execute();
  });
}

export async function saveGlobalRules(text: string): Promise<void> {
  await saveVersion(GLOBAL_NAME, null, text.trim());
}

export async function saveRecipeText(key: RecipeKey, text: string): Promise<void> {
  const recipe = getRecipe(key);
  await saveVersion(recipe.mode, recipe.kind, text.trim());
}

/** Returns to the built-in wording by deactivating every saved version. */
export async function resetPrompt(target: "global" | RecipeKey): Promise<void> {
  if (!hasDb()) throw new Error("Pangkalan data tidak tersedia.");
  const now = new Date().toISOString();
  let update = getDb()
    .updateTable("prompt_templates")
    .set({ status: "inactive", updated_at: now })
    .where("scope", "=", SCOPE);
  if (target === "global") {
    update = update.where("name", "=", GLOBAL_NAME).where("work_type", "is", null);
  } else {
    const recipe = getRecipe(target);
    update = update.where("name", "=", recipe.mode).where("work_type", "=", recipe.kind as WorkType);
  }
  await update.execute();
}
