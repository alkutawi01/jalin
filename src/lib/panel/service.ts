/**
 * Panel Bacaan AI: reading and writing the database. A snapshot is the exact text that was rated plus its hash; a rating belongs to one
 * snapshot. A piece whose text has changed since its newest snapshot is "stale": the old ratings are still there and still true of the
 * old text, they just no longer describe what would be published.
 */
import { createHash, randomInt } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { Database } from "../db/types";
import { DEFAULT_THRESHOLD, composite, frac, panelResult, parseThreshold, toDecimal, type Fraction, type PanelResult } from "./aggregate";
import { parseRating } from "./parser";
import { DEFAULT_REFERENCE_KEYWORDS, PANEL_WORK_TYPES, PROMPT_VERSION, REFERENCE_MODEL_NAME, RUBRIC_VERSION, THRESHOLD, isPanelWorkType, isReferenceModel, type PanelWorkType } from "./rubric";

type Db = Kysely<Database>;

/** What the chief editor can change. The rubric itself (components, weights, anchors) is not here: changing it means a new rubric version. */
export interface PanelSettings {
  threshold: Fraction;
  thresholdText: string;
  referenceName: string;
  referenceKeywords: string[];
}
export const DEFAULT_SETTINGS: PanelSettings = { threshold: DEFAULT_THRESHOLD, thresholdText: String(THRESHOLD), referenceName: REFERENCE_MODEL_NAME, referenceKeywords: [...DEFAULT_REFERENCE_KEYWORDS] };

export async function loadSettings(db: Db): Promise<PanelSettings> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db.selectFrom("panel_settings").select(["key", "value"]).execute();
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
  }
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const asked = get("threshold") ?? DEFAULT_SETTINGS.thresholdText;
  const parsed = parseThreshold(asked);
  const referenceName = (get("reference_name") ?? DEFAULT_SETTINGS.referenceName).trim() || DEFAULT_SETTINGS.referenceName;
  const keywords = (get("reference_keywords") ?? DEFAULT_SETTINGS.referenceKeywords.join(",")).split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  return { threshold: parsed ?? DEFAULT_THRESHOLD, thresholdText: parsed ? asked : DEFAULT_SETTINGS.thresholdText, referenceName, referenceKeywords: keywords.length ? keywords : [...DEFAULT_REFERENCE_KEYWORDS] };
}

export interface SettingsInput { threshold: string; referenceName: string; referenceKeywords: string }

/** Validate and store. Returns the reasons when something is not acceptable and writes nothing. */
export async function saveSettings(db: Db, input: SettingsInput, by: string): Promise<{ ok: true; settings: PanelSettings } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  if (!parseThreshold(input.threshold.trim())) errors.push("Ambang mesti nombor antara 1 dan 10 (paling banyak tiga perpuluhan), contohnya 8 atau 7.75.");
  const name = input.referenceName.trim();
  if (!name || name.length > 40) errors.push("Nama model rujukan diperlukan (paling banyak 40 aksara).");
  const keywords = input.referenceKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (keywords.length === 0 || keywords.some((k) => k.length < 2 || k.length > 30)) errors.push("Beri sekurang-kurangnya satu kata padanan nama model (2 hingga 30 aksara setiap satu, dipisahkan koma), contohnya gpt, openai.");
  if (errors.length > 0) return { ok: false, errors };
  const now = new Date();
  const pairs: [string, string][] = [["threshold", input.threshold.trim().replace(",", ".")], ["reference_name", name], ["reference_keywords", keywords.join(",")]];
  for (const [key, value] of pairs) {
    await db.insertInto("panel_settings").values({ key, value, updated_at: now, updated_by: by })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value, updated_at: now, updated_by: by })).execute();
  }
  return { ok: true, settings: await loadSettings(db) };
}
export type SubjectKind = "work" | "submission";
/** Did this model help write the piece? "tidak_diketahui" is not "tidak". */
export type Contributed = "ya" | "tidak" | "tidak_diketahui";
export const asContributed = (value: unknown): Contributed => (value === "ya" || value === "tidak" ? value : "tidak_diketahui");

export interface Assembled {
  kind: SubjectKind;
  id: string;
  workType: PanelWorkType;
  title: string;
  text: string;
  hash: string;
  coverage: string;
  manifest: Record<string, unknown>;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newRefCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `PNL-${out}`;
}

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Gather the text as it is now. Returns null when the subject is not there or is not a kind the panel rates. */
export async function assemble(db: Db, kind: SubjectKind, id: string): Promise<Assembled | { error: string }> {
  if (kind === "submission") {
    const row = await db.selectFrom("work_submissions").selectAll().where("id", "=", Number(id)).executeTakeFirst();
    if (!row) return { error: "Kiriman tidak ditemui." };
    if (!isPanelWorkType(row.proposed_type)) return { error: "Panel hanya menilai cerpen, novela dan bersiri. Jenis kiriman ini tidak layak." };
    const text = (row.manuscript ?? "").trim();
    if (!text) return { error: "Kiriman ini tiada manuskrip." };
    const title = row.proposed_title?.trim() || `Kiriman ${row.id}`;
    const sections = [{ position: 1, title: null as string | null, text }];
    return finish("submission", id, row.proposed_type, title, sections, `keseluruhan manuskrip kiriman (${wordCount(text)} perkataan)`, { source: "work_submissions" });
  }

  const work = await db.selectFrom("works").selectAll().where("id", "=", id).executeTakeFirst();
  if (!work) return { error: "Karya tidak ditemui." };
  if (!isPanelWorkType(work.type)) return { error: "Panel hanya menilai cerpen, novela dan bersiri. Jenis karya ini tidak layak." };
  const sectionRows = await db.selectFrom("reading_sections").select(["id", "slug", "title", "position", "body"]).where("work_id", "=", id).orderBy("position").execute();
  let sections: { position: number; title: string | null; text: string; sectionId?: number }[];
  if (sectionRows.length > 0) sections = sectionRows.map((s) => ({ position: s.position, title: s.title, text: (s.body ?? "").trim(), sectionId: s.id }));
  else sections = [{ position: 1, title: null, text: (work.body ?? "").trim() }];
  sections = sections.filter((s) => s.text.length > 0);
  if (sections.length === 0) return { error: "Karya ini belum mempunyai teks." };

  const words = sections.reduce((n, s) => n + wordCount(s.text), 0);
  let coverage: string;
  const manifest: Record<string, unknown> = { source: "works", workVersion: work.version, workStatus: work.status };
  if (work.type === "novela") {
    coverage = `novela, ${sections.length} bahagian (${words} perkataan), mengikut susunan dalam sistem`;
  } else if (work.type === "bersiri") {
    const entry = await sql<{ position: number; title: string; status: string; mode: string }>`
      SELECT e.position, s.title, s.status, s.mode FROM series_entries e JOIN series s ON s.id = e.series_id WHERE e.work_id = ${id} LIMIT 1`.execute(db);
    const e = entry.rows[0];
    if (e) {
      coverage = `satu episod sahaja (Episod ${e.position} dalam siri "${e.title}", siri ${e.status === "completed" ? "sudah tamat" : "belum tamat"}, mod ${e.mode}); episod lain tidak diberi, jangan menilai atau mengandaikan siri keseluruhan (${words} perkataan)`;
      Object.assign(manifest, { series: e.title, episode: e.position, seriesStatus: e.status, seriesMode: e.mode });
    } else {
      coverage = `satu karya bersiri yang belum diletakkan dalam siri (${words} perkataan)`;
    }
  } else {
    coverage = `keseluruhan teks (${sections.length} bahagian, ${words} perkataan)`;
  }
  return finish("work", id, work.type, work.title, sections, coverage, manifest);
}

/** The hash a snapshot is known by: the same arithmetic for the live text and for a frozen published copy, so the two can be compared. */
function canonicalHash(kind: SubjectKind, workType: string, title: string, sections: { position: number; title: string | null; text: string }[]): string {
  return sha256(JSON.stringify({ kind, workType, title, sections: sections.map((s) => [s.position, s.title, s.text]) }));
}

/**
 * The hash of the text readers have now: the frozen copy of the published version (not the draft that may have been edited since).
 * null when the work is not published or has no frozen copy.
 */
export async function publishedTextHash(db: Db, workId: string): Promise<string | null> {
  const work = await db.selectFrom("works").select(["type", "status", "published_revision_id"]).where("id", "=", workId).executeTakeFirst();
  if (!work || work.status !== "published" || !work.published_revision_id || !isPanelWorkType(work.type)) return null;
  const rev = await db.selectFrom("work_revisions").select(["snapshot"]).where("id", "=", String(work.published_revision_id)).executeTakeFirst();
  if (!rev) return null;
  const snap = (typeof rev.snapshot === "string" ? JSON.parse(rev.snapshot) : rev.snapshot) as { title?: string; body?: string; sections?: { body?: string | null; title?: string | null; position?: number }[]; readingSections?: { body?: string | null; title?: string | null; position?: number }[] };
  const raw = (snap.readingSections?.length ? snap.readingSections : snap.sections) ?? [];
  let sections: { position: number; title: string | null; text: string }[] = raw.length > 0
    ? raw.map((s, i) => ({ position: typeof s.position === "number" ? s.position : i + 1, title: s.title ?? null, text: (s.body ?? "").trim() }))
    : [{ position: 1, title: null, text: (snap.body ?? "").trim() }];
  sections = sections.filter((s) => s.text.length > 0);
  if (sections.length === 0) return null;
  return canonicalHash("work", work.type, String(snap.title ?? ""), sections);
}

function finish(kind: SubjectKind, id: string, workType: PanelWorkType, title: string, sections: { position: number; title: string | null; text: string; sectionId?: number }[], coverage: string, extra: Record<string, unknown>): Assembled {
  const text = sections.length === 1 && !sections[0]!.title ? sections[0]!.text : sections.map((s) => `## Bahagian ${s.position}${s.title ? `: ${s.title}` : ""}\n\n${s.text}`).join("\n\n");
  const hash = canonicalHash(kind, workType, title, sections);
  return {
    kind, id, workType, title, text, hash, coverage,
    manifest: { ...extra, sections: sections.map((s) => ({ position: s.position, title: s.title, sectionId: s.sectionId ?? null, sectionHash: sha256(s.text).slice(0, 16), words: wordCount(s.text) })), words: sections.reduce((n, s) => n + wordCount(s.text), 0), assembledAt: new Date().toISOString() },
  };
}

export interface SnapshotRow { id: string; subject_kind: SubjectKind; subject_id: string; work_type: PanelWorkType; title: string; content_hash: string; char_count: number; ref_code: string; rubric_version: string; prompt_version: string; created_by: string | null; created_at: Date; manifest: Record<string, unknown> }

/** The snapshot for this exact text and rubric; made if it does not exist yet. */
export async function ensureSnapshot(db: Db, kind: SubjectKind, id: string, by: string, extraManifest: Record<string, unknown> = {}): Promise<{ snapshot: SnapshotRow; created: boolean } | { error: string }> {
  const a = await assemble(db, kind, id);
  if ("error" in a) return a;
  const found = await db.selectFrom("panel_snapshots").select(["id", "subject_kind", "subject_id", "work_type", "title", "content_hash", "char_count", "ref_code", "rubric_version", "prompt_version", "created_by", "created_at", "manifest"])
    .where("subject_kind", "=", kind).where("subject_id", "=", id).where("content_hash", "=", a.hash).where("rubric_version", "=", RUBRIC_VERSION).executeTakeFirst();
  if (found) return { snapshot: found as SnapshotRow, created: false };
  const inserted = await db.insertInto("panel_snapshots").values({
    subject_kind: kind, subject_id: id, work_type: a.workType, title: a.title, content_hash: a.hash, text_body: a.text,
    manifest: JSON.stringify({ ...a.manifest, ...extraManifest, coverage: a.coverage }), char_count: a.text.length, ref_code: newRefCode(), rubric_version: RUBRIC_VERSION, prompt_version: PROMPT_VERSION, created_by: by, created_at: new Date(),
  }).onConflict((oc) => oc.doNothing()).returning(["id"]).executeTakeFirst();
  const row = await db.selectFrom("panel_snapshots").select(["id", "subject_kind", "subject_id", "work_type", "title", "content_hash", "char_count", "ref_code", "rubric_version", "prompt_version", "created_by", "created_at", "manifest"])
    .where("subject_kind", "=", kind).where("subject_id", "=", id).where("content_hash", "=", a.hash).where("rubric_version", "=", RUBRIC_VERSION).executeTakeFirstOrThrow();
  return { snapshot: row as SnapshotRow, created: Boolean(inserted) };
}

export interface RatingRow {
  id: string; snapshotId: string; reviewerLabel: string; provider: string | null; contributed: Contributed; status: "valid" | "invalid";
  errors: string[]; warnings: string[]; modelClaimed: string | null; scores: Record<string, { score: number | null; evidence: string; reason: string; evidenceOk: boolean | null }> | null;
  compositeText: string | null; fraction: Fraction | null; evidenceFlagged: boolean; ageClass: string | null; summary: string | null; strengths: string | null; improvements: string | null;
  createdBy: string | null; createdAt: Date; voidedAt: Date | null; voidedBy: string | null; voidReason: string | null; raw: string;
}

function toRating(r: Record<string, any>): RatingRow {
  return {
    id: r.id, snapshotId: r.snapshot_id, reviewerLabel: r.reviewer_label, provider: r.provider, contributed: r.contributed, status: r.status,
    errors: (r.errors ?? []) as string[], warnings: (r.warnings ?? []) as string[], modelClaimed: r.model_claimed, scores: r.scores,
    compositeText: r.composite_text, fraction: r.composite_num !== null && r.composite_den !== null ? frac(BigInt(r.composite_num), BigInt(r.composite_den)) : null,
    evidenceFlagged: r.evidence_flagged, ageClass: r.age_class, summary: r.summary, strengths: r.strengths, improvements: r.improvements,
    createdBy: r.created_by, createdAt: r.created_at, voidedAt: r.voided_at, voidedBy: r.voided_by, voidReason: r.void_reason, raw: r.raw_response,
  };
}

export async function ratingsOf(db: Db, snapshotId: string): Promise<RatingRow[]> {
  const rows = await db.selectFrom("panel_ratings").selectAll().where("snapshot_id", "=", snapshotId).orderBy("created_at").execute();
  return rows.map((r) => toRating(r as Record<string, any>));
}

/** Valid, un-voided ratings made by the official reviewer (ChatGPT): the only ones the mean is made of. */
export const counted = (r: RatingRow, settings: PanelSettings = DEFAULT_SETTINGS): boolean => r.status === "valid" && !r.voidedAt && Boolean(r.fraction) && isReferenceModel(r.reviewerLabel, settings.referenceKeywords);
/** Valid ratings by other models: kept and shown, never counted. */
export const supplementary = (r: RatingRow, settings: PanelSettings = DEFAULT_SETTINGS): boolean => r.status === "valid" && !r.voidedAt && Boolean(r.fraction) && !isReferenceModel(r.reviewerLabel, settings.referenceKeywords);

export function resultOf(ratings: RatingRow[], settings: PanelSettings = DEFAULT_SETTINGS): PanelResult {
  return panelResult(ratings.filter((r) => counted(r, settings)).map((r) => r.fraction!), settings.threshold);
}

/** The plain mean of the supplementary ratings, for comparison beside the official one. */
export function supplementaryResult(ratings: RatingRow[], settings: PanelSettings = DEFAULT_SETTINGS): PanelResult {
  return panelResult(ratings.filter((r) => supplementary(r, settings)).map((r) => r.fraction!), settings.threshold);
}

export interface AddRatingInput { snapshotId: string; reviewerLabel?: string; provider?: string; contributed?: Contributed; raw: string; by: string }
export type AddRatingOutcome = { ok: true; rating: RatingRow } | { ok: false; errors: string[]; ratingId: string };

/** Parse an answer and keep it either way (an invalid one is kept with its reasons, so nothing is quietly retried away). */
export async function addRating(db: Db, input: AddRatingInput): Promise<AddRatingOutcome> {
  const snap = await db.selectFrom("panel_snapshots").selectAll().where("id", "=", input.snapshotId).executeTakeFirst();
  if (!snap) throw new Error("Snapshot not found.");
  const raw = input.raw.slice(0, 60000);
  if (snap.rubric_version !== RUBRIC_VERSION) throw new Error("This snapshot was made with an older rubric; prepare the text again.");
  const parsed = parseRating(raw, { code: snap.ref_code, snapshotText: snap.text_body });
  // The reviewer is named by the answer itself (its MODEL line) unless the caller says otherwise: nobody has to type it.
  const claimed = parsed.ok ? parsed.rating.modelClaimed : (/^[\s>*\-•]*MODEL\s*:\s*(.+)$/im.exec(raw)?.[1] ?? "");
  const label = (input.reviewerLabel?.trim() || claimed.trim() || "Penilai tidak dinamakan").slice(0, 80);
  if (!parsed.ok) {
    const row = await db.insertInto("panel_ratings").values({ snapshot_id: snap.id, reviewer_label: label, provider: input.provider?.trim().slice(0, 80) || null, contributed: asContributed(input.contributed), status: "invalid", errors: JSON.stringify(parsed.errors), warnings: "[]", raw_response: raw, created_by: input.by, created_at: new Date() }).returning("id").executeTakeFirstOrThrow();
    return { ok: false, errors: parsed.errors, ratingId: row.id };
  }
  const scoreMap = Object.fromEntries(parsed.rating.components.map((c) => [c.key, c.score]));
  const comp = composite(scoreMap);
  const warnings = [...parsed.rating.warnings];
  if (parsed.rating.modelClaimed && input.reviewerLabel && !normaliseName(parsed.rating.modelClaimed).includes(normaliseName(label)) && !normaliseName(label).includes(normaliseName(parsed.rating.modelClaimed))) warnings.push(`Nama model dalam jawapan ("${parsed.rating.modelClaimed.slice(0, 40)}") berbeza daripada nama yang dimasukkan ("${label}"). Nama yang dimasukkan digunakan.`);
  const flagged = parsed.rating.components.some((c) => c.evidenceOk === false);
  const row = await db.insertInto("panel_ratings").values({
    snapshot_id: snap.id, reviewer_label: label, provider: input.provider?.trim().slice(0, 80) || null, contributed: asContributed(input.contributed), status: "valid",
    errors: "[]", warnings: JSON.stringify(warnings), model_claimed: parsed.rating.modelClaimed.slice(0, 120),
    scores: JSON.stringify(Object.fromEntries(parsed.rating.components.map((c) => [c.key, { score: c.score, evidence: c.evidence, reason: c.reason, evidenceOk: c.evidenceOk }]))),
    composite_num: comp.num.toString(), composite_den: comp.den.toString(), composite_text: toDecimal(comp, 3), evidence_flagged: flagged,
    age_class: null, summary: parsed.rating.verdict, strengths: null, improvements: null, raw_response: raw, created_by: input.by, created_at: new Date(),
  }).returningAll().executeTakeFirstOrThrow();
  return { ok: true, rating: toRating(row as Record<string, any>) };
}
const normaliseName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export async function voidRating(db: Db, ratingId: string, reason: string, by: string): Promise<boolean> {
  const why = reason.trim();
  if (!why) throw new Error("A reason is required.");
  const res = await db.updateTable("panel_ratings").set({ voided_at: new Date(), voided_by: by, void_reason: why.slice(0, 500) }).where("id", "=", ratingId).where("voided_at", "is", null).executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}

export interface Candidate {
  kind: SubjectKind; id: string; title: string; workType: string; status: string; eligible: boolean; why: string | null;
  snapshotId: string | null; stale: boolean; result: PanelResult | null; flagged: number; ratingCount: number; invalidCount: number;
}

/** Every work and submission the panel could rate, with where each stands. */
export async function listCandidates(db: Db, settings?: PanelSettings): Promise<Candidate[]> {
  const cfg = settings ?? (await loadSettings(db));
  const works = await db.selectFrom("works").select(["id", "title", "type", "status"]).where("type", "in", [...PANEL_WORK_TYPES]).where("status", "<>", "archived").orderBy("updated_at", "desc").execute();
  const subs = await db.selectFrom("work_submissions").select(["id", "proposed_title", "proposed_type", "status"]).orderBy("updated_at", "desc").limit(100).execute();
  const items: { kind: SubjectKind; id: string; title: string; type: string; status: string }[] = [
    ...works.map((w) => ({ kind: "work" as const, id: w.id, title: w.title, type: w.type, status: w.status })),
    ...subs.map((s) => ({ kind: "submission" as const, id: String(s.id), title: s.proposed_title || `Kiriman ${s.id}`, type: s.proposed_type ?? "", status: s.status })),
  ];
  const out: Candidate[] = [];
  for (const item of items) {
    const eligible = isPanelWorkType(item.type);
    const latest = eligible
      ? await db.selectFrom("panel_snapshots").select(["id", "content_hash", "rubric_version"]).where("subject_kind", "=", item.kind).where("subject_id", "=", item.id).orderBy("created_at", "desc").limit(1).executeTakeFirst()
      : undefined;
    let stale = false;
    let result: PanelResult | null = null;
    let flagged = 0, ratingCount = 0, invalidCount = 0;
    if (latest) {
      const a = await assemble(db, item.kind, item.id);
      stale = "error" in a ? true : a.hash !== latest.content_hash || latest.rubric_version !== RUBRIC_VERSION;
      const rs = await ratingsOf(db, latest.id);
      result = resultOf(rs, cfg);
      ratingCount = rs.filter((r) => counted(r, cfg)).length;
      invalidCount = rs.filter((r) => r.status === "invalid").length;
      flagged = rs.filter((r) => counted(r, cfg) && r.evidenceFlagged).length;
    }
    out.push({ kind: item.kind, id: item.id, title: item.title, workType: item.type || "tiada jenis", status: item.status, eligible, why: eligible ? null : "Jenis ini tidak dinilai panel.", snapshotId: latest?.id ?? null, stale, result, flagged, ratingCount, invalidCount });
  }
  return out;
}

export interface TimelineEvent { at: Date; what: string; count: number; meanText: string | null; meets: boolean | null; by: string | null }

/** How the mean came to be what it is: one line for every rating added or voided, in order, with the mean right after it. Built from the ratings themselves, which are never edited. */
export function timeline(ratings: RatingRow[], settings: PanelSettings = DEFAULT_SETTINGS): TimelineEvent[] {
  const events: { at: Date; kind: "add" | "void"; r: RatingRow }[] = [];
  for (const r of ratings) {
    if (r.status !== "valid" || !r.fraction || !isReferenceModel(r.reviewerLabel, settings.referenceKeywords)) continue;
    events.push({ at: r.createdAt, kind: "add", r });
    if (r.voidedAt) events.push({ at: r.voidedAt, kind: "void", r });
  }
  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  const live = new Map<string, Fraction>();
  const out: TimelineEvent[] = [];
  for (const e of events) {
    if (e.kind === "add") live.set(e.r.id, e.r.fraction!); else live.delete(e.r.id);
    const result = panelResult([...live.values()], settings.threshold);
    out.push({ at: e.at, what: e.kind === "add" ? `Ditambah: ${e.r.reviewerLabel} (${e.r.compositeText})` : `Dibatalkan: ${e.r.reviewerLabel} (${e.r.compositeText})`, count: result.count, meanText: result.meanText, meets: result.meetsThreshold, by: e.kind === "add" ? e.r.createdBy : e.r.voidedBy });
  }
  return out;
}

export interface Extras { low: string | null; high: string | null; providers: string[]; unknownProvider: number; contributedYes: number; contributedUnknown: number }

/** What an editor should know beside the mean: the spread, whether the reviewers are really different, whether any helped write the piece. */
export function extrasOf(ratings: RatingRow[], settings: PanelSettings = DEFAULT_SETTINGS): Extras {
  const live = ratings.filter((r) => counted(r, settings));
  const sorted = [...live].sort((a, b) => (a.fraction!.num * b.fraction!.den < b.fraction!.num * a.fraction!.den ? -1 : 1));
  const names = new Set<string>();
  let unknownProvider = 0;
  for (const r of live) { const p = (r.provider ?? "").trim().toLowerCase(); if (p) names.add(p); else unknownProvider++; }
  return {
    low: sorted[0]?.compositeText ?? null, high: sorted[sorted.length - 1]?.compositeText ?? null,
    providers: [...names], unknownProvider,
    contributedYes: live.filter((r) => r.contributed === "ya").length, contributedUnknown: live.filter((r) => r.contributed === "tidak_diketahui").length,
  };
}
