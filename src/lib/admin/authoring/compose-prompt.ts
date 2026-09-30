/**
 * Builds the text that "Salin Arahan AI" copies. Layers, like Adjung:
 *   1. peraturan am (global rules, editable by Ketua Editor)
 *   2. arahan resipi (per kind + mode, editable)
 *   3. konteks siri (bersiri only, from the database)
 *   4. arahan khas editor (optional, for this one work)
 *   5. format jawapan (fixed by code)
 * The editor never sees this text; the button copies it.
 */

import { DEFAULT_GLOBAL_RULES, DEFAULT_RECIPE_TEXT } from "./default-prompts";
import { buildFormatBlock } from "./output-format";
import { getRecipe, type RecipeKey } from "./recipes";

export type SeriesContext =
  | { kind: "baharu" }
  | { kind: "sambung"; title: string; mode: string; previousEpisodes: string[]; previousSummaries?: string[] };

export interface ComposeInput {
  recipe: RecipeKey;
  /** Edited global rules from Tetapan; falls back to the default. */
  globalRules?: string | null;
  /** Edited recipe instruction from Tetapan; falls back to the default. */
  recipeText?: string | null;
  series?: SeriesContext | null;
  specialInstruction?: string | null;
}

function seriesBlock(series: SeriesContext | null | undefined): string | null {
  if (!series) return null;
  if (series.kind === "baharu") {
    return "KONTEKS SIRI\nEpisod ini ialah episod pertama bagi sebuah siri BAHARU. Sediakan juga maklumat siri dalam bahagian [SIRI].";
  }
  const number = series.previousEpisodes.length + 1;
  const previous = series.previousEpisodes.length
    ? "Episod terdahulu: " + series.previousEpisodes.map((title, i) => `${i + 1}) ${title}${series.previousSummaries?.[i] ? ` — ${series.previousSummaries[i]}` : ""}`).join("; ") + "."
    : "";
  return [
    "KONTEKS SIRI",
    `Episod ini ialah episod ke-${number} bagi siri sedia ada "${series.title}" (${series.mode === "anthology" ? "antologi" : "bersambung"}). ${previous}`.trim(),
    "Bagi siri bersambung, semak kesinambungan watak, hubungan, masa dan peristiwa daripada ringkasan terdahulu; jangan andaikan tajuk sahaja mencukupi sebagai canon. Jika ringkasan tidak cukup, minta editor membekalkan nota canon. Jangan sediakan maklumat siri; hanya maklumat episod ini."
  ].join("\n");
}

export function composeAiPrompt(input: ComposeInput): string {
  const recipe = getRecipe(input.recipe);
  const globalRules = (input.globalRules ?? "").trim() || DEFAULT_GLOBAL_RULES;
  const recipeText = (input.recipeText ?? "").trim() || DEFAULT_RECIPE_TEXT[input.recipe];
  const special = (input.specialInstruction ?? "").trim();

  const parts = [
    globalRules,
    recipeText,
    seriesBlock(input.series),
    special ? `ARAHAN KHAS EDITOR (untuk karya ini sahaja)\n${special}` : null,
    buildFormatBlock(recipe, { newSeries: input.series?.kind === "baharu" }),
    recipe.needsManuscript
      ? "BAHAN\nTeks karya yang lengkap akan ditampal atau dilampirkan oleh editor selepas arahan ini."
      : "BAHAN\nMaklumat karya sumber akan diberi oleh editor selepas arahan ini."
  ].filter((part): part is string => Boolean(part));

  return parts.join("\n\n");
}
