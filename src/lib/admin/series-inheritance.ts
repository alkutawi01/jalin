/**
 * A new episode of a series does not start empty. Izzat: "saya terpaksa masukkan kredit utk setiap episod bersiri sedangkan
 * episod tu masih dlm siri yg sama", and "takkan dua episod berlainan genre padahal judul yg sama?". The facts that belong to
 * the series as a whole are carried over from the series and from the episode before:
 *   - genre and audience: those of the latest earlier episode whose genre is filled in (the pair together), else the series' own.
 *     The episode comes first because an editor changes an episode's genre and audience as the story develops while the series
 *     row is rarely revisited: in the real data the series said 21-50 and both published episodes said 18-50. An episode with no
 *     genre is an untouched draft, so its automatic audience default is not taken as a choice;
 *   - credits: those of the latest earlier episode that has a byline (else any credits), without exact duplicates;
 *   - characters and places (Latar tempat): the same episode's, for a continuing series only (an anthology's episodes are
 *     separate stories), with the chapter reference cleared because it points at the other episode's sections.
 * Episode-only things are never carried: title, dek, text, reading minutes, pictures, glossary, editor's note, version.
 * The values are a starting point: the editor still reviews and changes them, as with any draft.
 *
 * The pure functions below decide; the two database functions load and write.
 */

import type { Kysely, Transaction } from "kysely";
import type { Database } from "../db/types";
import { canonicalRole } from "../credit-roles";
import { DEFAULT_AUDIENCE } from "../audience";
import { displayableGenre } from "../reader/genre-display";
import { PLACES_MAX, PLACE_DESCRIPTION_MAX, PLACE_NAME_MAX } from "./work-service";

type Db = Kysely<Database> | Transaction<Database>;

export interface InheritedCredit {
  contributorSlug: string | null;
  guestName: string | null;
  roleLabel: string;
  byline: boolean;
  isPublic: boolean;
}
export interface InheritedCharacter {
  name: string;
  role: string;
  firstAppearanceSection: null;
}
export interface InheritedPlace {
  name: string;
  description?: string;
}

/** One earlier episode as the decision needs it. */
export interface EpisodeFacts {
  workId: string;
  title: string;
  position: number;
  status: string;
  genre: string | null;
  audience: string | null;
  metadata: Record<string, unknown> | null;
  credits: InheritedCredit[];
}

export interface SeriesFacts {
  id: string;
  mode: string;
  genre: string | null;
  audience: string | null;
}

export interface SeriesInheritance {
  seriesId: string;
  mode: string;
  genre: string | null;
  audience: string | null;
  /** The episode the credits, characters and places come from. */
  from: { workId: string; title: string; position: number } | null;
  credits: InheritedCredit[];
  characters: InheritedCharacter[];
  places: InheritedPlace[];
}

/** What a draft started in a series is given, and what is left to the editor. */
export { DEFAULT_AUDIENCE };

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
/** A genre an editor really chose: not empty and not one of the placeholders the reader hides ("needs_review", "-"). */
const genreText = (value: unknown): string | null => (typeof value === "string" ? displayableGenre(value) ?? null : null);
/** Names compared ignoring case, accents and spacing ("José" = "jose"). */
const foldName = (value: string): string => value.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase("ms").replace(/\s+/g, " ").trim();

export function creditKey(credit: Pick<InheritedCredit, "contributorSlug" | "guestName" | "roleLabel">): string {
  const who = credit.contributorSlug ? `c:${credit.contributorSlug}` : `g:${foldName(credit.guestName ?? "")}`;
  return `${who}|${foldName(canonicalRole(credit.roleLabel))}`;
}

/** The same person in the same role twice is one credit (episode 1 of a real series has "claude / co_writer" twice). */
export function dedupeCredits(credits: InheritedCredit[]): InheritedCredit[] {
  const seen = new Map<string, InheritedCredit>();
  const out: InheritedCredit[] = [];
  for (const credit of credits) {
    const key = creditKey(credit);
    const first = seen.get(key);
    if (first) {
      // The same person and role twice: keep the first, but not at the cost of losing "under the title" or "public" from the other.
      first.byline = first.byline || credit.byline;
      first.isPublic = first.isPublic || credit.isPublic;
      continue;
    }
    const copy = { ...credit, roleLabel: canonicalRole(credit.roleLabel) };
    seen.set(key, copy);
    out.push(copy);
  }
  return out;
}

/**
 * The episode to copy from: the latest earlier one that has a public byline (a started draft with only "Idea asal" is not a
 * complete set), else the latest with any credit, else the latest at all. Archived episodes are not used.
 */
export function pickReference(episodes: EpisodeFacts[]): EpisodeFacts | null {
  const usable = episodes.filter((e) => e.status !== "archived").sort((a, b) => b.position - a.position);
  return (
    usable.find((e) => e.credits.some((c) => c.byline)) ??
    usable.find((e) => e.credits.length > 0) ??
    usable[0] ??
    null
  );
}

function charactersOf(metadata: Record<string, unknown> | null): InheritedCharacter[] {
  const list = metadata?.characters;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: InheritedCharacter[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const name = text((entry as { name?: unknown }).name);
    const role = text((entry as { role?: unknown }).role);
    if (!name || !role) continue;
    const key = foldName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, role, firstAppearanceSection: null });
  }
  return out;
}

function placesOf(metadata: Record<string, unknown> | null): InheritedPlace[] {
  const list = metadata?.places;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: InheritedPlace[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const name = text((entry as { name?: unknown }).name);
    if (!name || name.length > PLACE_NAME_MAX) continue;
    const key = foldName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const description = text((entry as { description?: unknown }).description);
    out.push(description && description.length <= PLACE_DESCRIPTION_MAX ? { name, description } : { name });
    if (out.length >= PLACES_MAX) break;
  }
  return out;
}

/** Everything a new episode of this series inherits, given the series and the episodes before it. */
export function inheritFromSeries(series: SeriesFacts, earlier: EpisodeFacts[]): SeriesInheritance {
  const newestFirst = earlier.filter((e) => e.status !== "archived").sort((a, b) => b.position - a.position);
  const reference = pickReference(earlier);
  const touched = newestFirst.find((e) => genreText(e.genre));
  const shared = series.mode !== "anthology";
  return {
    seriesId: series.id,
    mode: series.mode,
    genre: genreText(touched?.genre) ?? genreText(series.genre),
    audience: text(touched?.audience) ?? text(series.audience),
    from: reference ? { workId: reference.workId, title: reference.title, position: reference.position } : null,
    credits: reference ? dedupeCredits(reference.credits) : [],
    characters: reference && shared ? charactersOf(reference.metadata) : [],
    places: reference && shared ? placesOf(reference.metadata) : []
  };
}

/** The columns a brand-new draft is inserted with (genre, audience, metadata). Without a series it is the plain default. */
export function draftDefaults(inheritance: SeriesInheritance | null): {
  genre: string | null;
  audience: string;
  metadata: Record<string, unknown> | null;
} {
  const metadata: Record<string, unknown> = {};
  if (inheritance?.characters.length) metadata.characters = inheritance.characters;
  if (inheritance?.places.length) metadata.places = inheritance.places;
  return {
    genre: inheritance?.genre ?? null,
    audience: inheritance?.audience ?? DEFAULT_AUDIENCE,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

/**
 * For the chatbot import: own entries first (the chatbot just read this episode), then the inherited ones it did not mention.
 * Names are compared ignoring case and accents.
 */
export function mergeByName<T extends { name: string }>(own: T[], inherited: T[]): T[] {
  const seen = new Set(own.map((e) => foldName(e.name)));
  return [...own, ...inherited.filter((e) => !seen.has(foldName(e.name)))];
}

/**
 * For the chatbot import of an episode that continues a series: the inherited credits come first (they name real contributors),
 * then any writer the chatbot or the editor named who is not already among them. "Already among them" means the same person (the
 * name of an inherited guest, or the display name of an inherited contributor, looked up by the caller) in the same role: a person
 * who held another role before (e.g. "Pengarah") still gets the credit the chatbot or editor gave them now.
 */
export function mergeImportCredits(
  own: Array<{ guestName: string; roleLabel: string; byline: boolean; isPublic: boolean }>,
  inherited: InheritedCredit[],
  displayNames: ReadonlyMap<string, string>
): InheritedCredit[] {
  const asCredit = (c: (typeof own)[number]): InheritedCredit => ({ contributorSlug: null, guestName: c.guestName, roleLabel: c.roleLabel, byline: c.byline, isPublic: c.isPublic });
  if (inherited.length === 0) return own.map(asCredit);
  const known = new Set<string>();
  for (const c of inherited) {
    const name = c.contributorSlug ? displayNames.get(c.contributorSlug) : c.guestName;
    if (name) known.add(`${foldName(name)}|${foldName(canonicalRole(c.roleLabel))}`);
  }
  return [...inherited, ...own.filter((c) => !known.has(`${foldName(c.guestName)}|${foldName(canonicalRole(c.roleLabel))}`)).map(asCredit)];
}

/** A short Malay sentence naming what an episode was given, for the editor ("Diisi: genre, 4 kredit, 6 watak daripada Episod 1"). */
export function describeFilled(
  filled: { genre: boolean; audience: boolean; credits: number; characters: number; places: number; audienceWas?: string | null },
  from: { position: number } | null
): string {
  const parts: string[] = [];
  if (filled.genre) parts.push("genre");
  if (filled.audience) parts.push(filled.audienceWas ? `audiens (menggantikan ${filled.audienceWas})` : "audiens");
  if (filled.credits) parts.push(`${filled.credits} kredit`);
  if (filled.characters) parts.push(`${filled.characters} watak`);
  if (filled.places) parts.push(`${filled.places} latar tempat`);
  if (!parts.length) return "Tiada yang perlu ditambah: maklumat siri sudah ada pada episod ini.";
  const base = `Diisi: ${parts.join(", ")}${from ? ` daripada Episod ${from.position}` : " daripada siri"}.`;
  // Credits go public if nobody looks at them (AGENTS.md #23), so every message that copied some says to check them.
  return filled.credits ? `${base} Semak kredit: buang sesiapa yang tidak menulis episod ini.` : base;
}

// ── database ────────────────────────────────────────────────────────────────

/**
 * Reads the series and the episodes before position `before` (all of them when omitted), and decides what to inherit.
 * Returns null when the series does not exist.
 */
export async function loadSeriesInheritance(
  db: Db,
  seriesId: string,
  options: { before?: number; excludeWorkId?: string } = {}
): Promise<SeriesInheritance | null> {
  const series = await db.selectFrom("series").where("id", "=", seriesId).select(["id", "mode", "genre", "audience"]).executeTakeFirst();
  if (!series) return null;

  let query = db
    .selectFrom("series_entries")
    .innerJoin("works", "works.id", "series_entries.work_id")
    .where("series_entries.series_id", "=", seriesId)
    .select(["works.id as workId", "works.title", "works.status", "works.genre", "works.audience", "works.metadata", "series_entries.position"]);
  if (options.before !== undefined) query = query.where("series_entries.position", "<", options.before);
  if (options.excludeWorkId) query = query.where("works.id", "!=", options.excludeWorkId);
  const rows = await query.execute();

  const creditRows = rows.length
    ? await db
        .selectFrom("credits")
        .where("work_id", "in", rows.map((r) => r.workId))
        .orderBy("sort_order", "asc")
        .orderBy("id", "asc")
        .select(["work_id", "contributor_slug", "guest_name", "role_label", "byline", "is_public"])
        .execute()
    : [];
  const creditsByWork = new Map<string, InheritedCredit[]>();
  for (const c of creditRows) {
    const list = creditsByWork.get(c.work_id) ?? [];
    list.push({ contributorSlug: c.contributor_slug, guestName: c.guest_name, roleLabel: c.role_label, byline: c.byline, isPublic: c.is_public });
    creditsByWork.set(c.work_id, list);
  }

  const episodes: EpisodeFacts[] = rows.map((r) => ({
    workId: r.workId,
    title: r.title,
    position: r.position,
    status: r.status,
    genre: r.genre,
    audience: r.audience,
    metadata: (r.metadata ?? null) as Record<string, unknown> | null,
    credits: creditsByWork.get(r.workId) ?? []
  }));
  return inheritFromSeries({ id: series.id, mode: String(series.mode), genre: series.genre, audience: series.audience }, episodes);
}

/** Adds the credits to a work, numbering them after `startOrder`. Returns how many were added. */
export async function insertInheritedCredits(
  db: Db,
  workId: string,
  credits: InheritedCredit[],
  options: { now: string; startOrder?: number }
): Promise<number> {
  let order = options.startOrder ?? 0;
  for (const credit of credits) {
    order += 1;
    await db
      .insertInto("credits")
      .values({
        work_id: workId,
        contributor_slug: credit.contributorSlug,
        guest_name: credit.contributorSlug ? null : credit.guestName,
        role_label: credit.roleLabel,
        byline: credit.byline,
        is_public: credit.isPublic,
        sort_order: order,
        created_at: options.now
      })
      .execute();
  }
  return credits.length;
}

export interface FillResult {
  from: { workId: string; title: string; position: number } | null;
  genre: boolean;
  audience: boolean;
  credits: number;
  characters: number;
  places: number;
  /** The audience that was replaced (the automatic default), so the message can say so. */
  audienceWas?: string | null;
  message: string;
}

/**
 * For an episode that already exists (a draft made before episodes inherited, or one the editor started empty): fills only what
 * is missing, from the series and the episodes before it. Nothing the editor has written is replaced.
 *  - genre: only when empty;
 *  - audience: when empty, or when it is still the old automatic default "13-17" on an episode whose genre was also empty
 *    (an untouched draft) while the series says otherwise;
 *  - credits: those of the reference episode that this episode does not already have (same person and role);
 *  - characters and places: only when the episode has none.
 * Published and archived episodes are refused: a published text changes through a new version, not silently.
 */
export async function fillEpisodeFromSeries(trx: Transaction<Database>, seriesId: string, workId: string): Promise<FillResult> {
  const entry = await trx.selectFrom("series_entries").where("series_id", "=", seriesId).where("work_id", "=", workId).select("position").executeTakeFirst();
  if (!entry) throw new Error("Episod ini tidak ditemui dalam siri.");
  const work = await trx
    .selectFrom("works")
    .where("id", "=", workId)
    .select(["status", "genre", "audience", "metadata"])
    .forUpdate()
    .executeTakeFirst();
  if (!work) throw new Error("Karya tidak ditemui.");
  if (work.status === "published" || work.status === "archived") {
    throw new Error("Episod yang sudah terbit atau diarkib tidak boleh diisi daripada siri.");
  }

  const inheritance = await loadSeriesInheritance(trx, seriesId, { before: entry.position, excludeWorkId: workId });
  if (!inheritance) throw new Error("Siri tidak ditemui.");

  const patch: { genre?: string; audience?: string; metadata?: string } = {};
  const untouched = !text(work.genre);
  const filled: { genre: boolean; audience: boolean; credits: number; characters: number; places: number; audienceWas?: string | null } = { genre: false, audience: false, credits: 0, characters: 0, places: 0 };

  if (untouched && inheritance.genre) {
    patch.genre = inheritance.genre;
    filled.genre = true;
  }
  const audience = text(work.audience);
  if (inheritance.audience && (!audience || (untouched && (audience === DEFAULT_AUDIENCE || audience === "13-17") && inheritance.audience !== audience))) {
    patch.audience = inheritance.audience;
    filled.audience = true;
    if (audience) filled.audienceWas = audience;
  }

  const metadata = { ...((work.metadata ?? {}) as Record<string, unknown>) };
  if (!Array.isArray(metadata.characters) || metadata.characters.length === 0) {
    if (inheritance.characters.length) {
      metadata.characters = inheritance.characters;
      filled.characters = inheritance.characters.length;
    }
  }
  if (!Array.isArray(metadata.places) || metadata.places.length === 0) {
    if (inheritance.places.length) {
      metadata.places = inheritance.places;
      filled.places = inheritance.places.length;
    }
  }
  if (filled.characters || filled.places) patch.metadata = JSON.stringify(metadata);

  const existing = await trx
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .select(["contributor_slug", "guest_name", "role_label", "sort_order", "byline"])
    .execute();
  // An episode that already has a name under its title has had its credits decided by the editor: they are the editor's, and the
  // series' credits are not piled on top of them (the editor may differ from the series on purpose).
  const ownCredits = existing.some((c) => c.byline);
  const have = new Set(existing.map((c) => creditKey({ contributorSlug: c.contributor_slug, guestName: c.guest_name, roleLabel: c.role_label })));
  const missing = ownCredits ? [] : inheritance.credits.filter((c) => !have.has(creditKey(c)));
  const now = new Date().toISOString();
  if (missing.length) {
    const last = existing.reduce((max, c) => Math.max(max, c.sort_order), 0);
    filled.credits = await insertInheritedCredits(trx, workId, missing, { now, startOrder: last });
  }

  if (Object.keys(patch).length) {
    await trx.updateTable("works").where("id", "=", workId).set({ ...patch, updated_at: now }).execute();
  }
  return { from: inheritance.from, ...filled, message: describeFilled(filled, inheritance.from) };
}
