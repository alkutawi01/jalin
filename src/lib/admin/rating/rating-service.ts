/**
 * Ratings in the database: the whole text of what is rated, the reference code of that text, and the ratings pasted in.
 *
 * What may be rated: a cerpen, a novela (all its chapters), or a whole series that is finished (all its episodes). A single
 * episode, a series still going on, a synopsis and a fragment are not rated. A rating is optional: most works have none.
 */
import { randomUUID } from "node:crypto";
import { getDb } from "../../db";
import { assembleFullText, countTextWords, fullTextFileName, partHeading, referenceCode, textHash, type TextPart } from "./full-text";
import { parseRatingPaste, type ParseResult, type ParsedEvidence } from "./parse";
import { buildRatingPrompt } from "./prompt";
import { COMPONENTS, RUBRIC_VERSION, consensus, scoreLabel } from "./rubric";

export type TargetKind = "work" | "series";
export const isTargetKind = (value: unknown): value is TargetKind => value === "work" || value === "series";

export interface RatingTarget {
  kind: TargetKind;
  id: string;
  slug: string;
  title: string;
  /** "cerpen", "novela" or "bersiri". */
  type: string;
  /** May it be rated, and if not, why. */
  eligible: boolean;
  reason: string | null;
  text: string;
  words: number;
  hash: string;
  code: string;
  fileName: string;
}

const KIND_LABEL: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri" };

/** The text of one work: its chapters in order when it has them, otherwise its body. */
async function workParts(workId: string, body: string | null, word: "Bab" | "Episod" = "Bab"): Promise<TextPart[]> {
  const sections = await getDb().selectFrom("reading_sections").where("work_id", "=", workId).orderBy("position", "asc").select(["title", "position", "body"]).execute();
  if (sections.length > 0) return sections.map((s, i) => ({ heading: partHeading(word, i + 1, s.title), body: s.body ?? "" }));
  return [{ heading: "", body: body ?? "" }];
}

export async function loadRatingTarget(kind: TargetKind, id: string): Promise<RatingTarget | undefined> {
  const db = getDb();
  let slug: string;
  let title: string;
  let type: string;
  let reason: string | null = null;
  let parts: TextPart[] = [];

  if (kind === "work") {
    const work = await db.selectFrom("works").where("id", "=", id).select(["id", "slug", "title", "type", "body"]).executeTakeFirst();
    if (!work) return undefined;
    ({ slug, title } = work);
    type = work.type;
    if (type === "bersiri") reason = "Episod tidak dinilai satu demi satu. Nilai siri penuh di halaman sirinya, selepas siri itu tamat.";
    else if (type !== "cerpen" && type !== "novela") reason = "Hanya cerpen, novela dan siri yang tamat dinilai.";
    parts = await workParts(work.id, work.body);
  } else {
    const series = await db.selectFrom("series").where("id", "=", id).select(["id", "slug", "title", "status"]).executeTakeFirst();
    if (!series) return undefined;
    ({ slug, title } = series);
    type = "bersiri";
    const entries = await db
      .selectFrom("series_entries")
      .innerJoin("works", "works.id", "series_entries.work_id")
      .where("series_entries.series_id", "=", id)
      .orderBy("series_entries.position", "asc")
      .select(["works.id as id", "works.title as title", "works.body as body"])
      .execute();
    for (const [index, entry] of entries.entries()) {
      const inner = await workParts(entry.id, entry.body);
      const body = inner.map((p) => (p.heading ? `${p.heading}\n\n${p.body}` : p.body)).join("\n\n");
      parts.push({ heading: partHeading("Episod", index + 1, entry.title), body });
    }
    if (series.status !== "completed") reason = "Siri ini masih diteruskan. Hanya siri yang sudah tamat boleh dinilai.";
    else if (entries.length === 0) reason = "Siri ini belum ada episod.";
  }

  const text = assembleFullText({ title, kindLabel: KIND_LABEL[type] ?? type, parts });
  const words = countTextWords(parts.map((p) => p.body).join("\n"));
  if (!reason && words === 0) reason = "Karya ini belum ada teks.";
  const hash = textHash(text);
  return { kind, id, slug, title, type, eligible: reason === null, reason, text, words, hash, code: referenceCode(kind, id, hash, RUBRIC_VERSION), fileName: fullTextFileName(slug) };
}

export interface RatingRecord {
  id: string;
  reviewer: string;
  rubricVersion: string;
  scores: Record<string, number>;
  reasons: Record<string, string>;
  evidence: Record<string, ParsedEvidence>;
  overall: number;
  label: string;
  audience: string;
  verdict: string;
  review: string;
  strengths: string[];
  weaknesses: string[];
  contentWarnings: string;
  status: string;
  isCurrent: boolean;
  /** The text has changed since this rating read it. */
  stale: boolean;
  createdAt: string;
}

export interface RatingState {
  target: Omit<RatingTarget, "text"> & { textChars: number };
  components: Array<{ key: string; label: string }>;
  /** The instruction to copy; the short one is for use with the downloaded file attached. */
  prompt: string;
  promptWithFile: string;
  ratings: RatingRecord[];
  /** The middle of the current ratings that still stand (not turned away, not stale). */
  consensus: { value: number; label: string; count: number } | null;
}

const asObject = <T,>(value: unknown, fallback: T): T => {
  if (value && typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export async function getRatingState(kind: TargetKind, id: string): Promise<RatingState | undefined> {
  const target = await loadRatingTarget(kind, id);
  if (!target) return undefined;
  const rows = await getDb().selectFrom("ratings").where("target_kind", "=", kind).where("target_id", "=", id).orderBy("created_at", "desc").selectAll().execute();
  const ratings: RatingRecord[] = rows.map((row) => {
    const overall = Number(row.overall);
    return {
      id: row.id,
      reviewer: row.reviewer,
      rubricVersion: row.rubric_version,
      scores: asObject<Record<string, number>>(row.scores, {}),
      reasons: asObject<Record<string, string>>(row.reasons, {}),
      evidence: asObject<Record<string, ParsedEvidence>>(row.evidence, {}),
      overall,
      label: scoreLabel(overall),
      audience: row.audience ?? "",
      verdict: row.verdict,
      review: row.review,
      strengths: asObject<string[]>(row.strengths, []),
      weaknesses: asObject<string[]>(row.weaknesses, []),
      contentWarnings: row.content_warnings ?? "",
      status: row.status,
      isCurrent: row.is_current,
      stale: row.text_hash !== target.hash || row.rubric_version !== RUBRIC_VERSION,
      createdAt: new Date(row.created_at).toISOString()
    };
  });
  const standing = ratings.filter((r) => r.isCurrent && r.status !== "rejected" && !r.stale);
  const middle = consensus(standing.map((r) => r.overall));
  const { text, ...rest } = target;
  return {
    target: { ...rest, textChars: text.length },
    components: COMPONENTS.map((c) => ({ key: c.key, label: c.label })),
    prompt: buildRatingPrompt({ type: target.type, title: target.title, code: target.code, text }),
    promptWithFile: buildRatingPrompt({ type: target.type, title: target.title, code: target.code }),
    ratings,
    consensus: middle === null ? null : { value: middle, label: scoreLabel(middle), count: standing.length }
  };
}

export class RatingError extends Error {
  constructor(message: string, readonly errors: string[] = [message]) {
    super(message);
  }
}

/** Read a pasted answer against the text as it is now, without keeping anything. */
export async function previewRating(kind: TargetKind, id: string, raw: string): Promise<ParseResult> {
  const target = await loadRatingTarget(kind, id);
  if (!target) throw new RatingError("Karya tidak ditemui.");
  if (!target.eligible) throw new RatingError(target.reason ?? "Karya ini tidak boleh dinilai.");
  return parseRatingPaste(raw, { expectedCode: target.code, text: target.text });
}

/** Keep a pasted rating. It becomes that rater's current rating; the rater's earlier ones stay as history. */
export async function saveRating(kind: TargetKind, id: string, raw: string, createdBy: string | null): Promise<{ id: string; warnings: string[] }> {
  const target = await loadRatingTarget(kind, id);
  if (!target) throw new RatingError("Karya tidak ditemui.");
  if (!target.eligible) throw new RatingError(target.reason ?? "Karya ini tidak boleh dinilai.");
  const parsed = parseRatingPaste(raw, { expectedCode: target.code, text: target.text });
  if (!parsed.ok) throw new RatingError(parsed.errors[0], parsed.errors);
  const r = parsed.rating;
  const reviewerKey = r.reviewer.toLowerCase();
  const ratingId = randomUUID();
  await getDb().transaction().execute(async (trx) => {
    await trx.updateTable("ratings").set({ is_current: false, updated_at: new Date() }).where("target_kind", "=", kind).where("target_id", "=", id).where("reviewer_key", "=", reviewerKey).where("is_current", "=", true).execute();
    await trx
      .insertInto("ratings")
      .values({
        id: ratingId,
        target_kind: kind,
        target_id: id,
        reviewer: r.reviewer,
        reviewer_key: reviewerKey,
        rubric_version: RUBRIC_VERSION,
        ref_code: target.code,
        text_hash: target.hash,
        text_words: target.words,
        scores: JSON.stringify(r.scores),
        reasons: JSON.stringify(r.reasons),
        evidence: JSON.stringify(r.evidence),
        overall: r.overall,
        audience: r.audience,
        verdict: r.verdict,
        review: r.review,
        strengths: JSON.stringify(r.strengths),
        weaknesses: JSON.stringify(r.weaknesses),
        content_warnings: r.contentWarnings || null,
        raw_response: raw.slice(0, 60000),
        status: "accepted",
        is_current: true,
        created_by: createdBy
      })
      .execute();
  });
  return { id: ratingId, warnings: parsed.warnings };
}

export const RATING_STATUSES = ["accepted", "published", "rejected"] as const;

/** Accept, publish or turn away a rating. Its numbers and words are never edited: a rating one disagrees with is turned away and done again. */
export async function setRatingStatus(ratingId: string, status: string): Promise<void> {
  if (!(RATING_STATUSES as readonly string[]).includes(status)) throw new RatingError("Status tidak sah.");
  const result = await getDb().updateTable("ratings").set({ status, updated_at: new Date() }).where("id", "=", ratingId).executeTakeFirst();
  if (Number(result.numUpdatedRows) === 0) throw new RatingError("Penilaian tidak ditemui.");
}
