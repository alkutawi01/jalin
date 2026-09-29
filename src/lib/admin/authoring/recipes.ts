/**
 * Authoring recipes.
 *
 * Each kind of work is authored differently, so each has its own prompt:
 *
 *  - "data":  the editor already has the text (written by hand or with a
 *             chatbot before it came to Jalin). The chatbot only extracts the
 *             data Jalin needs (title, dek, glossary, characters, chapters,
 *             image scenes). It never writes the work.
 *  - "tulis": the chatbot WRITES the work (sinopsis/fragmen from a source work
 *             the editor names) and returns the text together with the data.
 *
 * Cerpen, novela and bersiri are always "data". Fragmen and sinopsis can be
 * either. So there are seven prompts, not one master prompt.
 */

export type WorkKind = "cerpen" | "novela" | "bersiri" | "fragmen" | "sinopsis";
export type AuthoringMode = "data" | "tulis";

export interface Recipe {
  key: RecipeKey;
  kind: WorkKind;
  mode: AuthoringMode;
  label: string;
  description: string;
  /** The editor pastes the finished text into Jalin (the chatbot does not return it). */
  needsManuscript: boolean;
  /** Output sections the chatbot must provide, in order. */
  sections: OutputSection[];
}

export type OutputSection = "KARYA" | "SIRI" | "KANDUNGAN" | "BAB" | "SUMBER" | "WATAK" | "GLOSARI" | "GAMBAR";

export type RecipeKey =
  | "cerpen.data"
  | "novela.data"
  | "bersiri.data"
  | "fragmen.data"
  | "fragmen.tulis"
  | "sinopsis.data"
  | "sinopsis.tulis";

export const KIND_LABELS: Record<WorkKind, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

export const KIND_DESCRIPTIONS: Record<WorkKind, string> = {
  cerpen: "Cerita pendek yang sudah siap ditulis.",
  novela: "Cerita panjang yang sudah siap, dibahagi kepada bab.",
  bersiri: "Satu episod bagi sebuah siri (siri baharu atau sambungan).",
  fragmen: "Sedutan bermakna daripada karya lain.",
  sinopsis: "Penceritaan semula editorial bagi karya lain."
};

const RECIPES: Record<RecipeKey, Recipe> = {
  "cerpen.data": {
    key: "cerpen.data",
    kind: "cerpen",
    mode: "data",
    label: "Cerpen — chatbot sediakan maklumat",
    description: "Cerpen sudah siap. Chatbot hanya mengeluarkan maklumat yang Jalin perlukan.",
    needsManuscript: true,
    sections: ["KARYA", "WATAK", "GLOSARI", "GAMBAR"]
  },
  "novela.data": {
    key: "novela.data",
    kind: "novela",
    mode: "data",
    label: "Novela — chatbot sediakan maklumat",
    description: "Novela sudah siap. Chatbot mengeluarkan maklumat dan senarai bab.",
    needsManuscript: true,
    sections: ["KARYA", "BAB", "WATAK", "GLOSARI", "GAMBAR"]
  },
  "bersiri.data": {
    key: "bersiri.data",
    kind: "bersiri",
    mode: "data",
    label: "Bersiri — chatbot sediakan maklumat episod",
    description: "Episod sudah siap. Chatbot mengeluarkan maklumat episod (dan maklumat siri jika siri baharu).",
    needsManuscript: true,
    sections: ["KARYA", "SIRI", "WATAK", "GLOSARI", "GAMBAR"]
  },
  "fragmen.data": {
    key: "fragmen.data",
    kind: "fragmen",
    mode: "data",
    label: "Fragmen — saya sudah ada teks",
    description: "Fragmen sudah ada. Chatbot hanya mengeluarkan maklumat dan sumber asal.",
    needsManuscript: true,
    sections: ["KARYA", "SUMBER", "GLOSARI", "GAMBAR"]
  },
  "fragmen.tulis": {
    key: "fragmen.tulis",
    kind: "fragmen",
    mode: "tulis",
    label: "Fragmen — chatbot menulis sepenuhnya",
    description: "Anda beri karya sumber; chatbot menghasilkan fragmen dan semua maklumat.",
    needsManuscript: false,
    sections: ["KARYA", "SUMBER", "KANDUNGAN", "GLOSARI", "GAMBAR"]
  },
  "sinopsis.data": {
    key: "sinopsis.data",
    kind: "sinopsis",
    mode: "data",
    label: "Sinopsis — saya sudah ada teks",
    description: "Sinopsis sudah ada. Chatbot hanya mengeluarkan maklumat dan sumber asal.",
    needsManuscript: true,
    sections: ["KARYA", "SUMBER", "GLOSARI", "GAMBAR"]
  },
  "sinopsis.tulis": {
    key: "sinopsis.tulis",
    kind: "sinopsis",
    mode: "tulis",
    label: "Sinopsis — chatbot menulis sepenuhnya",
    description: "Anda beri karya sumber; chatbot menghasilkan sinopsis dan semua maklumat.",
    needsManuscript: false,
    sections: ["KARYA", "SUMBER", "KANDUNGAN", "GLOSARI", "GAMBAR"]
  }
};

export const RECIPE_KEYS = Object.keys(RECIPES) as RecipeKey[];

export function isRecipeKey(value: string): value is RecipeKey {
  return Object.prototype.hasOwnProperty.call(RECIPES, value);
}

export function getRecipe(key: RecipeKey): Recipe {
  return RECIPES[key];
}

export function recipeFor(kind: WorkKind, mode: AuthoringMode): Recipe {
  const found = RECIPES[`${kind}.${mode}` as RecipeKey];
  if (!found) throw new Error(`Tiada resipi untuk ${kind} (${mode}).`);
  return found;
}

/** Kinds that offer a choice between the two modes. */
export function kindHasBothModes(kind: WorkKind): boolean {
  return kind === "fragmen" || kind === "sinopsis";
}

export const WORK_KINDS: WorkKind[] = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
