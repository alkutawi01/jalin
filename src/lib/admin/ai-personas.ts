/**
 * Which pseudonym (a contributor record) each AI writes under.
 *
 * Stored in `prompt_templates` as scope "ai_persona": name = the AI ("Claude"),
 * prompt_text = the contributor slug. Each save is a new version; the newest
 * active row wins, so no migration is needed. Set in Tetapan; used by the
 * credit dropdown so an editor picks "Claude" and gets the pseudonym.
 */

import { getDb, hasDb } from "../db";

const SCOPE = "ai_persona";

/** Pseudonyms already recorded in the system: an AI whose contributor record exists starts mapped to it. */
const KNOWN_SLUG: Record<string, string> = {
  ChatGPT: "chatgpt", // Rafiq Naim
  Claude: "nara-zahin", // confirmed by the product owner
  "Mimo (OpenCode)": "mimo",
  Gemini: "jamili-guga", // Jamili Guga (the writing test of 6 Oct 2026 gave this persona its profile)
  Grok: "irfan-zuhri" // Irfan Zuhri (named by the product owner, 8 Oct 2026)
};

export const DEFAULT_AIS = ["ChatGPT", "Claude", "Gemini", "Mimo (OpenCode)", "Grok", "Copilot", "DeepSeek"];

export interface AiPersona {
  ai: string;
  slug: string | null;
  displayName: string | null;
}

export interface ContributorOption {
  slug: string;
  displayName: string;
  kind: string;
}

export async function listContributorOptions(): Promise<ContributorOption[]> {
  if (!hasDb()) return [];
  const rows = await getDb().selectFrom("contributors").select(["slug", "display_name", "kind"]).orderBy("display_name").execute();
  return rows.map((row) => ({ slug: row.slug, displayName: row.display_name, kind: String(row.kind) }));
}

export async function listAiPersonas(): Promise<AiPersona[]> {
  if (!hasDb()) return DEFAULT_AIS.map((ai) => ({ ai, slug: null, displayName: null }));
  const db = getDb();
  const saved = await db
    .selectFrom("prompt_templates")
    .where("scope", "=", SCOPE)
    .where("status", "=", "active")
    .select(["name", "prompt_text", "version"])
    .orderBy("version", "desc")
    .execute();
  const bySlug = new Map<string, string>();
  const names: string[] = [...DEFAULT_AIS];
  for (const row of saved) {
    if (!bySlug.has(row.name)) bySlug.set(row.name, row.prompt_text);
    if (!names.includes(row.name)) names.push(row.name);
  }
  const contributors = new Map((await listContributorOptions()).map((c) => [c.slug, c.displayName]));
  return names.map((ai) => {
    const known = KNOWN_SLUG[ai] && contributors.has(KNOWN_SLUG[ai]) ? KNOWN_SLUG[ai] : null;
    const slug = bySlug.get(ai) || known || null;
    return { ai, slug, displayName: slug ? contributors.get(slug) ?? slug : null };
  });
}

/** Finds the contributor with this display name, or creates a virtual (Maya) one. */
export async function findOrCreatePersona(name: string): Promise<string> {
  if (!hasDb()) throw new Error("Pangkalan data tidak tersedia.");
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  const options = await listContributorOptions();
  const existing = options.find((c) => c.displayName.toLowerCase() === clean.toLowerCase());
  if (existing) return existing.slug;
  const base = clean
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "persona";
  let slug = base;
  for (let i = 2; options.some((c) => c.slug === slug); i++) slug = base + "-" + i;
  const now = new Date().toISOString();
  await getDb()
    .insertInto("contributors")
    .values({
      slug,
      display_name: clean,
      kind: "virtual",
      bio: null,
      disclosure: "Penulis maya Jalin yang bekerja di bawah kawal selia editorial manusia.",
      is_visible: true,
      created_at: now,
      updated_at: now
    })
    .execute();
  return slug;
}

/** slug null clears the pseudonym for that AI. */
export async function saveAiPersona(ai: string, slug: string | null): Promise<void> {
  if (!hasDb()) throw new Error("Pangkalan data tidak tersedia.");
  const name = ai.trim().slice(0, 60);
  if (!name) throw new Error("Nama AI diperlukan.");
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction().execute(async (trx) => {
    const latest = await trx
      .selectFrom("prompt_templates")
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .select((eb) => eb.fn.max("version").as("max"))
      .executeTakeFirst();
    await trx
      .updateTable("prompt_templates")
      .set({ status: "inactive", updated_at: now })
      .where("scope", "=", SCOPE)
      .where("name", "=", name)
      .execute();
    if (slug) {
      await trx
        .insertInto("prompt_templates")
        .values({
          name,
          prompt_text: slug,
          scope: SCOPE,
          work_type: null,
          work_id: null,
          version: Number(latest?.max ?? 0) + 1,
          status: "active",
          created_at: now,
          updated_at: now
        })
        .execute();
    }
  });
}
