/**
 * The background of each block of the home page, chosen in Tetapan from the Jalin theme colours only (never a free colour,
 * so every choice keeps the text readable).
 *
 * Stored like the list-page sentences in site-copy.ts: in `prompt_templates` as scope "site_theme", name = "home.<block>.ground",
 * prompt_text = the palette key. Each save is a new version and the newest active row wins, so no migration is needed. Choosing the
 * block's own default removes the saved row. Reading never throws: a database problem shows the default colours.
 */

import { getDb, hasDb } from "./db";

const SCOPE = "site_theme";

/** The theme colours an editor may pick from (the colours of the Jalin logo, plus white and black), with the tone that decides which text colours sit on top (see globals.css, [data-ground]). */
export const GROUNDS = [
  { key: "paper", label: "Kertas", hex: "#fbf8f2", tone: "light" },
  { key: "white", label: "Putih", hex: "#ffffff", tone: "light" },
  { key: "sand", label: "Peach muda", hex: "#f7ece4", tone: "light" },
  { key: "beige", label: "Peach", hex: "#d8b9a6", tone: "light" },
  { key: "ink", label: "Teal tua", hex: "#18343c", tone: "dark" },
  { key: "clay", label: "Terracotta", hex: "#a76450", tone: "dark" },
  { key: "black", label: "Hitam", hex: "#000000", tone: "dark" }
] as const;
export type GroundKey = (typeof GROUNDS)[number]["key"];

/** The home page blocks whose background can be chosen, in page order, with the colour each has until an editor picks another. */
export const HOME_BLOCKS = [
  { key: "hero", label: "Karya utama (karusel)", default: "paper" },
  { key: "stats", label: "Statistik (di bawah karusel)", default: "ink" },
  { key: "series", label: "Bersiri", default: "paper" },
  { key: "latest", label: "Karya terbaru", default: "paper" },
  { key: "categories", label: "Terokai kategori", default: "sand" }
] as const satisfies ReadonlyArray<{ key: string; label: string; default: GroundKey }>;
export type HomeBlockKey = (typeof HOME_BLOCKS)[number]["key"];

export type HomeGrounds = Record<HomeBlockKey, GroundKey>;

export const DEFAULT_GROUNDS: HomeGrounds = Object.fromEntries(HOME_BLOCKS.map((b) => [b.key, b.default])) as HomeGrounds;

const nameOf = (block: HomeBlockKey) => `home.${block}.ground`;

export function isGroundKey(value: unknown): value is GroundKey {
  return typeof value === "string" && GROUNDS.some((g) => g.key === value);
}

export function isHomeBlockKey(value: unknown): value is HomeBlockKey {
  return typeof value === "string" && HOME_BLOCKS.some((b) => b.key === value);
}

/** The saved choice of each block (blocks with nothing saved are left out). */
export async function listSavedGrounds(): Promise<Partial<HomeGrounds>> {
  const saved: Partial<HomeGrounds> = {};
  if (!hasDb()) return saved;
  const rows = await getDb()
    .selectFrom("prompt_templates")
    .where("scope", "=", SCOPE)
    .where("status", "=", "active")
    .select(["name", "prompt_text", "version"])
    .orderBy("version", "desc")
    .execute();
  for (const row of rows) {
    const block = HOME_BLOCKS.find((b) => nameOf(b.key) === row.name);
    const value = row.prompt_text.trim();
    if (block && !saved[block.key] && isGroundKey(value)) saved[block.key] = value;
  }
  return saved;
}

/** What the home page uses: the saved choice, or the block's default. Never throws. */
export async function homeGrounds(): Promise<HomeGrounds> {
  try {
    return { ...DEFAULT_GROUNDS, ...(await listSavedGrounds()) };
  } catch {
    return { ...DEFAULT_GROUNDS };
  }
}

export async function saveHomeGround(block: HomeBlockKey, ground: GroundKey): Promise<void> {
  const db = getDb();
  const name = nameOf(block);
  const now = new Date().toISOString();
  const isDefault = ground === DEFAULT_GROUNDS[block];
  await db.transaction().execute(async (trx) => {
    const latest = await trx
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .select((eb) => eb.fn.max("version").as("max"))
      .executeTakeFirst();
    await trx.updateTable("prompt_templates").set({ status: "inactive", updated_at: now }).where("scope", "=", SCOPE).where("name", "=", name).execute();
    if (!isDefault) {
      await trx
        .insertInto("prompt_templates")
        .values({ name, prompt_text: ground, scope: SCOPE, work_type: null, work_id: null, version: Number(latest?.max ?? 0) + 1, status: "active", created_at: now, updated_at: now })
        .execute();
    }
  });
}
