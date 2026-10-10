/**
 * Panel Bacaan AI, the reader's side. What a reader may see of the AI ratings of a published work:
 *
 *  - only ratings of exactly the text that is live now (same hash) and of the current rubric, so a score never describes another text;
 *  - the score of every reviewer, one decimal, whether or not it is above the threshold;
 *  - the summary (headline) is the number only; component scores and reasons are a second, separate call that the reader page
 *    makes only after the reader reaches "Tamat", so the reasons are not in the page source for someone who has not finished;
 *  - never the raw answer, the quoted evidence, warnings, the threshold or a pass/fail verdict.
 *
 * Any failure (for example a database without the panel tables) answers null: a reader page must never break because of this.
 */
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { panelResult, toDecimal } from "./aggregate";
import { COMPONENTS, RUBRIC_VERSION, isReferenceModel } from "./rubric";
import { displayVersion } from "../admin/version-label";
import { loadSettings, publishedTextHash, ratingsOf, type RatingRow } from "./service";

type Db = Kysely<Database>;

export interface PublicReviewer { name: string; official: boolean; score: string }
export interface PublicRatingSummary {
  reviewers: PublicReviewer[];
  /** Malay date of the newest rating, ISO date (yyyy-mm-dd). */
  ratedOn: string;
  textVersion: string | null;
}
export interface PublicRatingDetail {
  reviewers: { name: string; official: boolean; score: string; verdict: string | null; components: { code: string; title: string; score: string; reason: string }[] }[];
}

async function activeRatings(db: Db, workId: string): Promise<{ ratings: RatingRow[]; manifest: Record<string, unknown> } | null> {
  const hash = await publishedTextHash(db, workId);
  if (!hash) return null;
  const snap = await db.selectFrom("panel_snapshots").select(["id", "manifest"])
    .where("subject_kind", "=", "work").where("subject_id", "=", workId)
    .where("content_hash", "=", hash).where("rubric_version", "=", RUBRIC_VERSION).executeTakeFirst();
  if (!snap) return null;
  const ratings = (await ratingsOf(db, snap.id)).filter((r) => r.status === "valid" && !r.voidedAt && r.fraction && r.scores);
  if (ratings.length === 0) return null;
  return { ratings, manifest: (snap.manifest ?? {}) as Record<string, unknown> };
}

/** Readers see the product name, not the model build the editor typed ("GPT-6", "gemini-2.5-flash"). */
function publicName(label: string): string {
  const l = label.toLowerCase();
  if (/gpt|openai/.test(l)) return "ChatGPT";
  if (l.includes("grok")) return "Grok";
  if (l.includes("gemini")) return "Gemini";
  if (l.includes("claude")) return "Claude";
  return label.trim();
}

function groupByReviewer(ratings: RatingRow[]): Map<string, RatingRow[]> {
  const groups = new Map<string, RatingRow[]>();
  for (const r of ratings) { const k = publicName(r.reviewerLabel); groups.set(k, [...(groups.get(k) ?? []), r]); }
  return groups;
}

export async function publicRatingSummary(db: Db, workId: string): Promise<PublicRatingSummary | null> {
  try {
    const found = await activeRatings(db, workId);
    if (!found) return null;
    const settings = await loadSettings(db);
    const reviewers: PublicReviewer[] = [...groupByReviewer(found.ratings).entries()].map(([name, runs]) => {
      const mean = panelResult(runs.map((r) => r.fraction!), settings.threshold).mean!;
      return { name, official: isReferenceModel(name, settings.referenceKeywords), score: toDecimal(mean, 1) };
    });
    reviewers.sort((a, b) => Number(b.official) - Number(a.official) || a.name.localeCompare(b.name));
    const newest = found.ratings.reduce((a, r) => (r.createdAt > a ? r.createdAt : a), found.ratings[0]!.createdAt);
    const version = found.manifest.workVersion;
    return { reviewers, ratedOn: new Date(newest).toISOString().slice(0, 10), textVersion: typeof version === "string" || typeof version === "number" ? displayVersion(String(version)) : null };
  } catch {
    return null;
  }
}

export async function publicRatingDetail(db: Db, workId: string): Promise<PublicRatingDetail | null> {
  try {
    const found = await activeRatings(db, workId);
    if (!found) return null;
    const settings = await loadSettings(db);
    const reviewers = [...groupByReviewer(found.ratings).entries()].map(([name, runs]) => {
      const latest = runs[runs.length - 1]!;
      const mean = panelResult(runs.map((r) => r.fraction!), settings.threshold).mean!;
      const components = COMPONENTS.map((c) => {
        const vals = runs.map((r) => r.scores![c.key]?.score).filter((v): v is number => typeof v === "number");
        const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
        return { code: c.code, title: c.title, score: avg === null ? "" : (Math.round(avg * 10) / 10).toFixed(1), reason: (latest.scores![c.key]?.reason ?? "").trim() };
      }).filter((c) => c.score !== "");
      return { name, official: isReferenceModel(name, settings.referenceKeywords), score: toDecimal(mean, 1), verdict: latest.summary?.trim() || null, components };
    });
    reviewers.sort((a, b) => Number(b.official) - Number(a.official) || a.name.localeCompare(b.name));
    return { reviewers };
  } catch {
    return null;
  }
}
