/**
 * Text on the public list pages that an editor can change in Tetapan (the sentence under "Senarai Bersiri" and so on).
 *
 * Stored in `prompt_templates` as scope "site_copy": name = "category.<type>.intro", prompt_text = the sentence. Each save is
 * a new version and the newest active row wins (the same way the AI pseudonyms are kept), so no migration is needed. An
 * empty value removes the saved text and the default below is used again.
 */

import { getDb, hasDb } from "./db";

const SCOPE = "site_copy";

export const CATEGORY_TYPES = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const DEFAULT_CATEGORY_INTROS: Record<CategoryType, string> = {
  cerpen: "Cerita pendek berilustrasi untuk pembaca Jalin.",
  novela: "Novela pendek berilustrasi untuk pembaca Jalin.",
  bersiri: "Siri berilustrasi untuk pembaca Jalin — sambungan demi sambungan.",
  fragmen: "Sedutan bermakna daripada karya untuk pembaca Jalin.",
  sinopsis: "Penceritaan semula editorial karya lain."
};

/** The short line under each category name on the home page's tiles ("Cerpen", "Novela"...). */
export const DEFAULT_CATEGORY_TILES: Record<CategoryType, string> = {
  cerpen: "Cerita pendek berilustrasi untuk pembaca Jalin",
  novela: "Novela pendek berilustrasi untuk pembaca Jalin",
  bersiri: "Karya bersiri berilustrasi, sambungan demi sambungan",
  fragmen: "Sedutan bermakna daripada karya agung",
  sinopsis: "Penceritaan semula editorial karya lain"
};

export const CATEGORY_INTRO_MAX = 240;

export type CopyKind = "intro" | "tile";
const DEFAULTS: Record<CopyKind, Record<CategoryType, string>> = { intro: DEFAULT_CATEGORY_INTROS, tile: DEFAULT_CATEGORY_TILES };

const nameOf = (type: CategoryType, kind: CopyKind = "intro") => `category.${type}.${kind}`;

export function isCopyKind(value: unknown): value is CopyKind {
  return value === "intro" || value === "tile";
}

export function isCategoryType(value: unknown): value is CategoryType {
  return typeof value === "string" && (CATEGORY_TYPES as readonly string[]).includes(value);
}

/** The saved intro of each list page ("" when none is saved). */
export async function listSavedCategoryIntros(kind: CopyKind = "intro"): Promise<Record<CategoryType, string>> {
  const saved: Record<CategoryType, string> = { cerpen: "", novela: "", bersiri: "", fragmen: "", sinopsis: "" };
  if (!hasDb()) return saved;
  const rows = await getDb()
    .selectFrom("prompt_templates")
    .where("scope", "=", SCOPE)
    .where("status", "=", "active")
    .select(["name", "prompt_text", "version"])
    .orderBy("version", "desc")
    .execute();
  for (const row of rows) {
    const type = CATEGORY_TYPES.find((t) => nameOf(t, kind) === row.name);
    if (type && !saved[type]) saved[type] = row.prompt_text.trim();
  }
  return saved;
}

/** The intro to show on a list page: the saved one, or the default. Never throws: a database problem shows the default. */
export async function categoryIntro(type: CategoryType): Promise<string> {
  try {
    const saved = await listSavedCategoryIntros();
    return saved[type] || DEFAULT_CATEGORY_INTROS[type];
  } catch {
    return DEFAULT_CATEGORY_INTROS[type];
  }
}

/** The home page tile lines: the saved one or the default for each category. Never throws. */
export async function categoryTiles(): Promise<Record<CategoryType, string>> {
  try {
    const saved = await listSavedCategoryIntros("tile");
    return Object.fromEntries(CATEGORY_TYPES.map((t) => [t, saved[t] || DEFAULT_CATEGORY_TILES[t]])) as Record<CategoryType, string>;
  } catch {
    return { ...DEFAULT_CATEGORY_TILES };
  }
}

export async function saveCategoryIntro(type: CategoryType, text: string, kind: CopyKind = "intro"): Promise<void> {
  const value = text.trim();
  if (value.length > CATEGORY_INTRO_MAX) throw new Error(`Ayat pengenalan terlalu panjang (maksimum ${CATEGORY_INTRO_MAX} aksara).`);
  const db = getDb();
  const name = nameOf(type, kind);
  const now = new Date().toISOString();
  await db.transaction().execute(async (trx) => {
    const latest = await trx
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .select((eb) => eb.fn.max("version").as("max"))
      .executeTakeFirst();
    await trx.updateTable("prompt_templates").set({ status: "inactive", updated_at: now }).where("scope", "=", SCOPE).where("name", "=", name).execute();
    if (value && value !== DEFAULTS[kind][type]) {
      await trx
        .insertInto("prompt_templates")
        .values({ name, prompt_text: value, scope: SCOPE, work_type: null, work_id: null, version: Number(latest?.max ?? 0) + 1, status: "active", created_at: now, updated_at: now })
        .execute();
    }
  });
}
