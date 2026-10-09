/**
 * The words of a public page that an editor changes in Tetapan (Halaman Editorial, Halaman Tentang Kami).
 *
 * Stored in `prompt_templates` as one scope per page (the way site-copy.ts keeps the sentence under each list page): name = the
 * field, prompt_text = the text. Each save is a new version and the newest active row wins, so no migration is needed. An empty
 * value, or one equal to the default, removes the saved text and the default is used again.
 */

import { getDb, hasDb } from "./db";

export const PAGE_TEXT_MAX = 1200;

export type PageCopyStore<D extends Record<string, string>> = ReturnType<typeof pageCopyStore<D>>;

export function pageCopyStore<D extends Record<string, string>>(scope: string, defaults: D) {
  type Field = keyof D & string;
  const fields = Object.keys(defaults) as Field[];

  const isField = (value: unknown): value is Field => typeof value === "string" && Object.hasOwn(defaults, value);

  /** Every saved row, newest version of each name. Empty when there is no database. */
  async function saved(): Promise<Record<string, string>> {
    if (!hasDb()) return {};
    const rows = await getDb()
      .selectFrom("prompt_templates")
      .where("scope", "=", scope)
      .where("status", "=", "active")
      .select(["name", "prompt_text", "version"])
      .orderBy("version", "desc")
      .execute();
    const out: Record<string, string> = {};
    for (const row of rows) if (!(row.name in out)) out[row.name] = row.prompt_text.trim();
    return out;
  }

  /** What each field says now: the saved text, or the default. Never throws: a database problem shows the defaults. */
  async function load(): Promise<D & { raw: Record<string, string> }> {
    let raw: Record<string, string> = {};
    try {
      raw = await saved();
    } catch {
      raw = {};
    }
    const copy = Object.fromEntries(fields.map((field) => [field, raw[field] || defaults[field]])) as D;
    return { ...copy, raw };
  }

  /** Write one name as a new version; an empty value (or the default) removes it. */
  async function saveRaw(name: string, value: string, defaultValue: string | null): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.transaction().execute(async (trx) => {
      const latest = await trx
        .selectFrom("prompt_templates")
        .where("scope", "=", scope)
        .where("name", "=", name)
        .select((eb) => eb.fn.max("version").as("max"))
        .executeTakeFirst();
      await trx.updateTable("prompt_templates").set({ status: "inactive", updated_at: now }).where("scope", "=", scope).where("name", "=", name).execute();
      if (value && value !== defaultValue) {
        await trx
          .insertInto("prompt_templates")
          .values({ name, prompt_text: value, scope, work_type: null, work_id: null, version: Number(latest?.max ?? 0) + 1, status: "active", created_at: now, updated_at: now })
          .execute();
      }
    });
  }

  /** Save the changed fields; an empty one (or the default text) goes back to the default. */
  async function save(values: Partial<Record<Field, string>>): Promise<void> {
    for (const [field, raw] of Object.entries(values)) {
      if (!isField(field)) throw new Error("Medan tidak dikenali.");
      const value = String(raw ?? "").trim();
      if (value.length > PAGE_TEXT_MAX) throw new Error(`Teks terlalu panjang (maksimum ${PAGE_TEXT_MAX} aksara).`);
      await saveRaw(field, value, defaults[field]);
    }
  }

  return { scope, defaults, fields, isField, saved, load, saveRaw, save };
}
