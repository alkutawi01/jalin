/**
 * Panel Bacaan AI: what the pages need, as plain JSON. One piece (the "Penilaian AI" tab of a work, or a section of a submission) and the
 * module's own overview (Ringkasan). Pure reading; nothing here writes.
 */
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { frac, panelResult } from "./aggregate";
import { evidencePosition, normalise } from "./parser";
import { buildPrompt } from "./prompt";
import { COMPONENTS, FORMAT_NAME, RUBRIC_VERSION } from "./rubric";
import {
  assemble, extrasOf, listCandidates, loadSettings, ratingsOf, resultOf, supplementaryResult, timeline,
  counted, type Extras, type RatingRow, type SubjectKind,
} from "./service";
import { isReferenceModel } from "./rubric";

type Db = Kysely<Database>;

export interface RatingView {
  id: string; reviewer: string; status: "valid" | "invalid"; errors: string[]; warnings: string[];
  counted: boolean; composite: string | null; flagged: boolean; verdict: string | null;
  scores: Record<string, { score: number | null; evidence: string; reason: string; evidenceOk: boolean | null }> | null;
  createdAt: string; createdBy: string | null; voided: boolean; voidReason: string | null; voidedBy: string | null;
}
export interface ResultView { count: number; meanText: string | null; meets: boolean | null }
export interface TimelineView { at: string; what: string; count: number; meanText: string | null; meets: boolean | null; by: string | null }
export interface CompareModel {
  name: string;
  official: boolean;
  /** How many sessions this reviewer was asked (the official reviewer may have several; the scores are then their average). */
  runs: number;
  mean: string;
  scores: Record<string, number>;
  /** Where in the work (0 to 100) the evidence of each component sits; null when it cannot be located (meaning, not letters). */
  positions: Record<string, number | null>;
  verdict: string | null;
  flaggedComponents: number;
}
export interface CompareView {
  models: CompareModel[];
  /** The summary, computed from the numbers (not written by an AI). */
  summary: string[];
  /** Notes worth a glance: evidence all drawn from one part of the work, or not locatable. */
  notes: string[];
}

export interface ActiveView {
  snapshotId: string; refCode: string; createdAt: string; prompt: string; chars: number;
  ratings: RatingView[]; result: ResultView; extras: Extras; timeline: TimelineView[]; others: { count: number; meanText: string | null };
  compare: CompareView | null;
}
export interface OldView { snapshotId: string; refCode: string; createdAt: string; rubric: string; ratings: RatingView[]; result: ResultView }
export interface PanelView {
  eligible: boolean;
  /** Why this subject cannot be rated (type not covered, no text yet, not found). */
  problem: string | null;
  title: string;
  coverage: string;
  words: number | null;
  settings: { thresholdText: string; referenceName: string };
  rubric: { version: string; format: string };
  active: ActiveView | null;
  history: OldView[];
}

const toView = (r: RatingRow, isCounted: boolean): RatingView => ({
  id: r.id, reviewer: r.reviewerLabel, status: r.status, errors: r.errors, warnings: r.warnings, counted: isCounted,
  composite: r.compositeText, flagged: r.evidenceFlagged, verdict: r.summary, scores: r.scores,
  createdAt: r.createdAt.toISOString(), createdBy: r.createdBy, voided: Boolean(r.voidedAt), voidReason: r.voidReason, voidedBy: r.voidedBy,
});

const KEYS = COMPONENTS.map((c) => c.key);
const fmt3 = (n: number) => n.toFixed(3);

/** Group the valid ratings by reviewer and put the official one first; compute the summary from the numbers. */
export function buildCompare(rs: RatingRow[], settings: Awaited<ReturnType<typeof loadSettings>>, textNormalised: string): CompareView | null {
  const valid = rs.filter((r) => r.status === "valid" && !r.voidedAt && r.fraction && r.scores);
  if (valid.length === 0) return null;
  const groups = new Map<string, RatingRow[]>();
  for (const r of valid) groups.set(r.reviewerLabel, [...(groups.get(r.reviewerLabel) ?? []), r]);
  const models: CompareModel[] = [...groups.entries()].map(([name, runs]) => {
    const latest = runs[runs.length - 1]!;
    const scores: Record<string, number> = {};
    for (const k of KEYS) {
      const vals = runs.map((r) => r.scores![k]?.score).filter((v): v is number => typeof v === "number");
      if (vals.length) scores[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }
    const positions: Record<string, number | null> = {};
    let flagged = 0;
    for (const k of KEYS) {
      const c = latest.scores![k];
      if (!c) continue;
      positions[k] = evidencePosition(c.evidence, textNormalised);
      if (c.evidenceOk === false) flagged++;
    }
    const mean = panelResult(runs.map((r) => r.fraction!), settings.threshold);
    return { name, official: isReferenceModel(name, settings.referenceKeywords), runs: runs.length, mean: mean.meanText ?? "", scores, positions, verdict: latest.summary, flaggedComponents: flagged };
  });
  models.sort((a, b) => Number(b.official) - Number(a.official) || a.name.localeCompare(b.name));

  const nums = models.map((m) => Number(m.mean));
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const avg = (k: string) => { const v = models.map((m) => m.scores[k]).filter((x): x is number => x !== undefined); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); };
  const spread = (k: string) => { const v = models.map((m) => m.scores[k]).filter((x): x is number => x !== undefined); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
  const title = (k: string) => { const c = COMPONENTS.find((x) => x.key === k)!; return `${c.code} ${c.title}`; };
  const threshold = Number(settings.thresholdText);
  const summary: string[] = [];
  if (models.length === 1) {
    summary.push(`Satu penilai (${models[0]!.name}) memberi min ${fmt3(hi)}.`);
  } else {
    const above = nums.filter((n) => n > threshold).length;
    summary.push(`${models.length} penilai meletakkan karya ini antara ${fmt3(lo)} dan ${fmt3(hi)}; ${above === nums.length ? "semuanya di atas ambang" : above === 0 ? "tiada yang di atas ambang" : `${above} daripada ${nums.length} di atas ambang`} ${settings.thresholdText}. Julat ${fmt3(hi - lo)}: persetujuan ${hi - lo <= 0.25 ? "tinggi" : hi - lo <= 0.75 ? "sederhana" : "rendah"}.`);
  }
  const ranked = [...KEYS].sort((a, b) => avg(b) - avg(a));
  const best = ranked[0]!, worstAvg = Math.min(...KEYS.map(avg));
  const worst = KEYS.filter((k) => avg(k) === worstAvg);
  summary.push(`Paling kukuh: ${title(best)} (purata ${avg(best).toFixed(2)}). Paling rendah: ${worst.map((k) => title(k)).join(", ")} (purata ${worstAvg.toFixed(2)}).`);
  if (models.length > 1) {
    const wide = KEYS.filter((k) => spread(k) >= 0.5);
    if (wide.length) summary.push(`Penilai berbeza paling jauh pada ${wide.map((k) => title(k)).join(", ")} (beza ${Math.max(...wide.map(spread)).toFixed(1)}).`);
    const official = models.find((m) => m.official);
    if (official && official.name && Number(official.mean) === lo && lo < hi) summary.push("Penilai rasmi memberi min paling rendah.");
  }

  const notes: string[] = [];
  for (const m of models) {
    const placed = Object.values(m.positions).filter((p): p is number => p !== null);
    if (placed.length >= 4 && Math.max(...placed) - Math.min(...placed) < 40) notes.push(`${m.name}: rujukan tertumpu pada satu kawasan karya (${Math.min(...placed)}% hingga ${Math.max(...placed)}%).`);
    const unplaced = Object.values(m.positions).filter((p) => p === null).length;
    if (unplaced > 0) notes.push(`${m.name}: ${unplaced} rujukan bukan petikan harfiah (diolah semula), jadi lokasinya tidak dapat dikesan. Ini biasa dan bukan ralat.`);
  }
  return { models, summary, notes };
}

export async function panelView(db: Db, kind: SubjectKind, id: string): Promise<PanelView> {
  const settings = await loadSettings(db);
  const current = await assemble(db, kind, id);
  const snaps = await db
    .selectFrom("panel_snapshots")
    .select(["id", "title", "content_hash", "ref_code", "rubric_version", "char_count", "manifest", "created_at", "text_body", "work_type"])
    .where("subject_kind", "=", kind)
    .where("subject_id", "=", id)
    .orderBy("created_at", "desc")
    .execute();
  const head = { settings: { thresholdText: settings.thresholdText, referenceName: settings.referenceName }, rubric: { version: RUBRIC_VERSION, format: FORMAT_NAME } };
  if ("error" in current && snaps.length === 0) {
    return { eligible: false, problem: current.error, title: "", coverage: "", words: null, active: null, history: [], ...head };
  }
  const title = "error" in current ? snaps[0]!.title : current.title;
  const matching = "error" in current ? undefined : snaps.find((s) => s.content_hash === current.hash && s.rubric_version === RUBRIC_VERSION);
  const rated = [];
  for (const s of snaps) {
    const rs = await ratingsOf(db, s.id);
    rated.push({ s, rs, result: resultOf(rs, settings) });
  }
  const activeRow = matching ? rated.find((h) => h.s.id === matching.id)! : null;
  const coverage = matching ? String((matching.manifest as Record<string, unknown>).coverage ?? "") : "error" in current ? "" : current.coverage;
  const viewOf = (rs: RatingRow[]) => rs.map((r) => toView(r, counted(r, settings)));
  const resultView = (r: ReturnType<typeof resultOf>): ResultView => ({ count: r.count, meanText: r.meanText, meets: r.meetsThreshold });
  return {
    eligible: !("error" in current),
    problem: "error" in current ? current.error : null,
    title,
    coverage,
    words: "error" in current ? null : Number((current.manifest as { words?: number }).words ?? 0),
    active: activeRow
      ? {
          snapshotId: activeRow.s.id, refCode: activeRow.s.ref_code, createdAt: activeRow.s.created_at.toISOString(),
          prompt: buildPrompt({ code: activeRow.s.ref_code, title: activeRow.s.title, workType: activeRow.s.work_type, coverage, text: activeRow.s.text_body }),
          chars: activeRow.s.char_count, ratings: viewOf(activeRow.rs), result: resultView(activeRow.result),
          extras: extrasOf(activeRow.rs, settings),
          timeline: timeline(activeRow.rs, settings).map((t) => ({ at: t.at.toISOString(), what: t.what, count: t.count, meanText: t.meanText, meets: t.meets, by: t.by })),
          others: (() => { const o = supplementaryResult(activeRow.rs, settings); return { count: o.count, meanText: o.meanText }; })(),
          compare: buildCompare(activeRow.rs, settings, normalise(activeRow.s.text_body)),
        }
      : null,
    history: rated
      .filter((h) => h.s.id !== matching?.id)
      .map((h) => ({ snapshotId: h.s.id, refCode: h.s.ref_code, createdAt: h.s.created_at.toISOString(), rubric: h.s.rubric_version, ratings: viewOf(h.rs), result: resultView(h.result) })),
    ...head,
  };
}

export interface SummaryView {
  settings: { thresholdText: string; referenceName: string };
  works: { eligible: number; rated: number; notRated: number; stale: number; meets: number; notMeets: number };
  distribution: { label: string; count: number }[];
  components: { code: string; title: string; weight: number; average: string | null; n: number }[];
  quality: { invalidAnswers: number; flaggedRatings: number; supplementaryRatings: number; countedRatings: number };
  rows: { kind: string; id: string; title: string; workType: string; status: string; mean: string | null; meets: boolean | null; stale: boolean; ratingCount: number; flagged: number }[];
}

/** The module's overview: how many pieces are rated and how they spread, which component is weakest on average, how clean the answers are. */
export async function panelSummary(db: Db): Promise<SummaryView> {
  const settings = await loadSettings(db);
  const candidates = (await listCandidates(db, settings)).filter((c) => c.eligible);
  const rated = candidates.filter((c) => c.snapshotId && c.ratingCount > 0);
  const buckets: { label: string; test: (n: number) => boolean }[] = [
    { label: "di bawah 5", test: (n) => n < 5 }, { label: "5 hingga 7", test: (n) => n >= 5 && n < 7 }, { label: "7 hingga 8", test: (n) => n >= 7 && n < 8 },
    { label: "8 hingga 9", test: (n) => n >= 8 && n < 9 }, { label: "9 ke atas", test: (n) => n >= 9 },
  ];
  const distribution = buckets.map((b) => ({ label: b.label, count: rated.filter((c) => c.result?.meanText && b.test(Number(c.result.meanText))).length }));

  const all = await db.selectFrom("panel_ratings").select(["reviewer_label", "status", "voided_at", "evidence_flagged", "scores"]).execute();
  const sums = new Map<string, { total: number; n: number }>();
  let invalid = 0, flagged = 0, supplementary = 0, countedRatings = 0;
  for (const r of all) {
    if (r.status === "invalid") { invalid++; continue; }
    if (r.voided_at) continue;
    if (!isReferenceModel(r.reviewer_label, settings.referenceKeywords)) { supplementary++; continue; }
    countedRatings++;
    if (r.evidence_flagged) flagged++;
    for (const [key, c] of Object.entries((r.scores ?? {}) as Record<string, { score: number | null }>)) {
      if (c.score === null || c.score === undefined) continue;
      const cur = sums.get(key) ?? { total: 0, n: 0 };
      cur.total += c.score; cur.n++;
      sums.set(key, cur);
    }
  }
  return {
    settings: { thresholdText: settings.thresholdText, referenceName: settings.referenceName },
    works: {
      eligible: candidates.length, rated: rated.length, notRated: candidates.length - rated.length,
      stale: rated.filter((c) => c.stale).length,
      meets: rated.filter((c) => c.result?.meetsThreshold === true).length, notMeets: rated.filter((c) => c.result?.meetsThreshold === false).length,
    },
    distribution,
    components: COMPONENTS.map((c) => { const s = sums.get(c.key); return { code: c.code, title: c.title, weight: c.weight, average: s ? (s.total / s.n).toFixed(2) : null, n: s?.n ?? 0 }; }),
    quality: { invalidAnswers: invalid, flaggedRatings: flagged, supplementaryRatings: supplementary, countedRatings },
    rows: candidates.map((c) => ({ kind: c.kind, id: c.id, title: c.title, workType: c.workType, status: c.status, mean: c.result?.meanText ?? null, meets: c.result?.meetsThreshold ?? null, stale: c.stale, ratingCount: c.ratingCount, flagged: c.flagged })),
  };
}
