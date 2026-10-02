/**
 * Source provenance & rights governance (Phase 4D-7).
 *
 * Human editorial authority is final. This module records evidence, status,
 * reviewer, review date, and editorial notes — and enforces the human decision.
 * It never makes legal determinations and never auto-approves rights.
 */

import type { Kysely, Transaction } from "kysely";
import type { Database, RightsStatus } from "../db/types";
import { getDb, hasDb } from "../db";
import {
  computeMaterialHash,
  isPassRightsStatus,
} from "./publication-readiness";
import { evaluatePublicationReadiness } from "./publication-service";
import { classifyFragmen, fragmenTextHash, readFragmenTextReview } from "../content/fragmen-kind";
import { isSourcedWork } from "../content/source-origin";

/** Rights states that block publication (BLOCK). */
export const RIGHTS_BLOCK_STATUSES: ReadonlySet<string> = new Set([
  "unknown",
  "needs_review",
  "restricted",
  "rejected",
]);

export const ALL_RIGHTS_STATUSES: readonly RightsStatus[] = [
  "unknown",
  "needs_review",
  "public_domain",
  "licensed",
  "permission_obtained",
  "restricted",
  "rejected",
];

export const DERIVATIVE_WORK_TYPES: ReadonlySet<string> = new Set([
  "terjemahan",
  "fragmen",
  "sinopsis",
]);

export function isDerivativeWorkType(type: string): boolean {
  return DERIVATIVE_WORK_TYPES.has(String(type));
}

export interface SourceWorkRow {
  id: number;
  work_id: string;
  original_title: string | null;
  author: string | null;
  original_language: string | null;
  publication_year: number | null;
  source_edition: string | null;
  source_url: string | null;
  source_locator: string | null;
  source_text_basis: string | null;
  publisher?: string | null;
  edition_year?: number | null;
  printing?: string | null;
  editor_name?: string | null;
  translator_name?: string | null;
  isbn?: string | null;
  rights_status: string;
  rights_notes: string | null;
  rights_evidence: string | null;
  rights_history: string | null;
  approved_material_hash: string | null;
  reviewed_at: Date | string | null;
  reviewed_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface RightsHistoryEntry {
  at: string;
  actor: string;
  action: "review" | "provenance_edit" | "status_change";
  rights_status: string;
  material_hash?: string;
  note?: string;
}

export interface SourceRightsAdminView {
  workId: string;
  isDerivative: boolean;
  fragmenTextLanguage: string | null;
  /** Source fields the chatbot filled in that no editor has reviewed yet. */
  chatbotFilledFields: string[];
  /** Human confirmation that the displayed fragment text is Bahasa Melayu (null = not confirmed). */
  fragmenTextReview: { reviewedBy: string; reviewedAt: string; current: boolean } | null;
  sourceWork: {
    id: number;
    originalTitle: string | null;
    author: string | null;
    originalLanguage: string | null;
    publicationYear: number | null;
    sourceEdition: string | null;
    sourceUrl: string | null;
    sourceLocator: string | null;
    sourceTextBasis: string | null;
    publisher: string | null;
    editionYear: number | null;
    printing: string | null;
    editorName: string | null;
    translatorName: string | null;
    isbn: string | null;
    rightsStatus: string;
    rightsNotes: string | null;
    rightsEvidence: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    updatedAt: string;
  } | null;
  rightsHistory: RightsHistoryEntry[];
  rightsReady: boolean;
  rightsBlockers: { code: string; message: string }[];
}

/** Reader-safe public provenance projection. Never includes internal fields. */
export interface PublicSourceProvenance {
  originalTitle: string;
  author: string;
  language?: string;
  publicationYear?: number;
  edition?: string;
  locator?: string;
  rightsLabel?: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function parseRightsHistory(raw: string | null): RightsHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RightsHistoryEntry[];
    return [];
  } catch {
    return [];
  }
}

export function validateSourceUrl(url: string | null | undefined): {
  ok: boolean;
  reason?: string;
} {
  if (url === null || url === undefined || !String(url).trim()) {
    return { ok: true };
  }
  const trimmed = String(url).trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "source_url bukan URL yang sah." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "source_url mesti http:// atau https:// (javascript:/file:/data: tidak dibenarkan).",
    };
  }
  return { ok: true };
}

function getDbOrThrow(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[SourceRights] Database not available.");
  }
  return getDb();
}

export async function loadSourceWork(
  db: Kysely<Database> | Transaction<Database>,
  workId: string,
  options: { lock?: boolean } = {}
): Promise<SourceWorkRow | null> {
  const q = db.selectFrom("source_works").where("work_id", "=", workId).selectAll();
  const row = await (options.lock ? q.forUpdate() : q).executeTakeFirst();
  return (row as SourceWorkRow | undefined) ?? null;
}

export async function getSourceRightsView(
  workId: string
): Promise<SourceRightsAdminView | null> {
  const db = getDbOrThrow();
  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!work) return null;

  const isDerivative = isSourcedWork(String(work.type), work.metadata);
  const source = await loadSourceWork(db, workId);

  // Compute rights blockers via central readiness for a single source of truth.
  const readiness = await evaluatePublicationReadiness(workId);
  const rightsGate = readiness?.gates?.rights;
  const rightsBlockers = rightsGate?.blockers ?? [];
  const rightsReady = isDerivative
    ? Boolean(rightsGate?.pass)
    : true;

  return {
    workId,
    isDerivative,
    fragmenTextLanguage: typeof work.metadata?.fragmenTextLanguage === "string"
      ? work.metadata.fragmenTextLanguage : null,
    chatbotFilledFields: Array.isArray((work.metadata as { sourceChatbotFields?: unknown } | null)?.sourceChatbotFields)
      ? ((work.metadata as { sourceChatbotFields: unknown[] }).sourceChatbotFields.map(String)) : [],
    fragmenTextReview: (() => {
      const r = readFragmenTextReview(work.metadata);
      return r ? { reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt, current: r.textHash === fragmenTextHash(work.body) } : null;
    })(),
    sourceWork: source
      ? {
          id: Number(source.id),
          originalTitle: source.original_title,
          author: source.author,
          originalLanguage: source.original_language,
          publicationYear: source.publication_year,
          sourceEdition: source.source_edition,
          sourceUrl: source.source_url,
          sourceLocator: source.source_locator,
          sourceTextBasis: source.source_text_basis,
          publisher: source.publisher ?? null,
          editionYear: source.edition_year ?? null,
          printing: source.printing ?? null,
          editorName: source.editor_name ?? null,
          translatorName: source.translator_name ?? null,
          isbn: source.isbn ?? null,
          rightsStatus: String(source.rights_status),
          rightsNotes: source.rights_notes,
          rightsEvidence: source.rights_evidence,
          reviewedAt: toIso(source.reviewed_at),
          reviewedBy: source.reviewed_by,
          updatedAt: toIso(source.updated_at) ?? "",
        }
      : null,
  rightsHistory: parseRightsHistory(source?.rights_history ?? null),
  rightsReady,
  rightsBlockers,
  };
}

const EDITION_KEYS = ["publisher", "edition_year", "printing", "editor_name", "translator_name", "isbn"] as const;

/**
 * The edition columns exist only after migration 021. Until then they are left out of every write, so
 * saving a source keeps working; if an editor does fill one in before the migration, the database says so.
 */
function withoutUnusedEdition<T extends Record<string, unknown>>(values: T, existing: unknown, touched: boolean): T {
  const hasColumns = Boolean(existing) && typeof existing === "object" && "publisher" in (existing as object);
  if (hasColumns || touched) return values;
  const copy: Record<string, unknown> = { ...values };
  for (const key of EDITION_KEYS) delete copy[key];
  return copy as T;
}

export interface SourceProvenanceInput {
  fragmenTextLanguage?: string | null;
  originalTitle?: string | null;
  author?: string | null;
  originalLanguage?: string | null;
  publicationYear?: number | null;
  sourceEdition?: string | null;
  sourceUrl?: string | null;
  sourceLocator?: string | null;
  sourceTextBasis?: string | null;
  publisher?: string | null;
  editionYear?: number | null;
  printing?: string | null;
  editorName?: string | null;
  translatorName?: string | null;
  isbn?: string | null;
  /** Fields the chatbot filled in; shown to the editor until the next rights review. */
  chatbotFields?: string[];
  rightsNotes?: string | null;
  rightsEvidence?: string | null;
}

export interface SourceRightsResult {
  view: SourceRightsAdminView;
  invalidatedApproval: boolean;
}

async function saveFragmenTextLanguage(
  db: Kysely<Database>, workId: string, language: string | null | undefined,
  actor: { id: string; email?: string },
): Promise<boolean> {
  if (language === undefined) return false;
  const next = (language ?? "").trim();
  if (!next || next.length > 80) {
    throw new Error("Bahasa petikan terbitan wajib diisi (maksimum 80 aksara).");
  }
  return db.transaction().execute(async (trx) => {
    const work = await trx.selectFrom("works").where("id", "=", workId).selectAll().forUpdate().executeTakeFirst();
    if (!work) throw new Error("Work tidak ditemui.");
    if (work.type !== "fragmen") return false;
    const metadata = (work.metadata ?? {}) as Record<string, unknown>;
    if (metadata.fragmenTextLanguage === next) return false;
    await trx.updateTable("works").where("id", "=", workId)
      .set({ metadata: { ...metadata, fragmenTextLanguage: next, fragmenTextReview: undefined }, updated_at: new Date().toISOString() })
      .execute();
    const source = await loadSourceWork(trx, workId, { lock: true });
    if (!source || !isPassRightsStatus(source.rights_status)) return false;
    // Backfilling an omitted language with the already-reviewed source language
    // does not change the rights basis. A translation or later change still does.
    if (!metadata.fragmenTextLanguage &&
      classifyFragmen(source.original_language, next) === "asal") return false;
    const history = parseRightsHistory(source.rights_history);
    history.push({
      at: new Date().toISOString(), actor: actor.email || actor.id,
      action: "provenance_edit", rights_status: "needs_review",
      note: "Bahasa petikan diterbitkan berubah — semakan hak perlu diulang.",
    });
    await trx.updateTable("source_works").where("work_id", "=", workId)
      .set({ rights_status: "needs_review", reviewed_at: null, reviewed_by: null,
        approved_material_hash: null, rights_history: JSON.stringify(history) as never,
        updated_at: new Date().toISOString() })
      .execute();
    return true;
  });
}

/**
 * Upsert provenance metadata. Editing material fields after a PASS approval
 * invalidates the approval (rights_status → needs_review, review stamps cleared).
 * Does NOT set rights_status to a PASS state — that requires human rights-review.
 */
export async function upsertSourceProvenance(
  workId: string,
  input: SourceProvenanceInput,
  actor: { id: string; email?: string }
): Promise<SourceRightsResult> {
  const db = getDbOrThrow();
  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!work) throw new Error("Work tidak ditemui.");

  const type = String(work.type);
  if (!isSourcedWork(type, work.metadata)) {
    throw new Error(
      `Maklumat sumber hanya untuk karya bersumber (terjemahan, fragmen, sinopsis, atau cerpen/novela yang ditanda "daripada sumber lain") — karya ini jenis "${type}".`
    );
  }

  const urlCheck = validateSourceUrl(input.sourceUrl ?? null);
  if (!urlCheck.ok) throw new Error(urlCheck.reason);

  const invalidatedByLanguage = type === "fragmen"
    ? await saveFragmenTextLanguage(db, workId, input.fragmenTextLanguage, actor) : false;

  const existing = await loadSourceWork(db, workId);

  const next = {
    original_title: input.originalTitle !== undefined ? input.originalTitle : existing?.original_title ?? null,
    author: input.author !== undefined ? input.author : existing?.author ?? null,
    original_language:
      input.originalLanguage !== undefined ? input.originalLanguage : existing?.original_language ?? null,
    publication_year:
      input.publicationYear !== undefined ? input.publicationYear : existing?.publication_year ?? null,
    source_edition: input.sourceEdition !== undefined ? input.sourceEdition : existing?.source_edition ?? null,
    source_url: input.sourceUrl !== undefined ? input.sourceUrl : existing?.source_url ?? null,
    source_locator: input.sourceLocator !== undefined ? input.sourceLocator : existing?.source_locator ?? null,
    source_text_basis:
      input.sourceTextBasis !== undefined ? input.sourceTextBasis : existing?.source_text_basis ?? null,
    publisher: input.publisher !== undefined ? input.publisher : existing?.publisher ?? null,
    edition_year: input.editionYear !== undefined ? input.editionYear : existing?.edition_year ?? null,
    printing: input.printing !== undefined ? input.printing : existing?.printing ?? null,
    editor_name: input.editorName !== undefined ? input.editorName : existing?.editor_name ?? null,
    translator_name: input.translatorName !== undefined ? input.translatorName : existing?.translator_name ?? null,
    isbn: input.isbn !== undefined ? input.isbn : existing?.isbn ?? null,
    rights_notes: input.rightsNotes !== undefined ? input.rightsNotes : existing?.rights_notes ?? null,
    rights_evidence:
      input.rightsEvidence !== undefined ? input.rightsEvidence : existing?.rights_evidence ?? null,
  };

  const editionTouched = [input.publisher, input.editionYear, input.printing, input.editorName, input.translatorName, input.isbn].some((v) => v !== undefined);
  const nextHash = computeMaterialHash(next);
  const actorId = actor.email || actor.id;
  const nowIso = new Date().toISOString();

  const wasPass = existing
    ? isPassRightsStatus(String(existing.rights_status)) &&
      Boolean(existing.reviewed_at) &&
      Boolean(existing.reviewed_by)
    : false;
  const materialChanged = existing ? computeMaterialHash(existing) !== nextHash : false;
  // The material hash covers the source identity; the rights notes and evidence are what the approval
  // actually rested on, so changing them after approval also withdraws the approval.
  const norm = (v: string | null | undefined) => (v ?? "").trim();
  const evidenceChanged = existing
    ? norm(existing.rights_notes) !== norm(next.rights_notes) || norm(existing.rights_evidence) !== norm(next.rights_evidence)
    : false;
  // Edition details (publisher, printing year, editor, translator, ISBN) are part of what the approval
  // rested on. They are compared here rather than added to the material hash, so approvals given before
  // these fields existed stay valid until someone actually changes one.
  const editionChanged = existing
    ? (["publisher", "edition_year", "printing", "editor_name", "translator_name", "isbn"] as const).some(
        (key) => String(existing[key] ?? "").trim() !== String(next[key] ?? "").trim()
      )
    : false;
  const invalidatedApproval = invalidatedByLanguage || (wasPass && (materialChanged || evidenceChanged || editionChanged));

  const history = parseRightsHistory(existing?.rights_history ?? null);
  if (existing) {
    history.push({
      at: nowIso,
      actor: actorId,
      action: "provenance_edit",
      rights_status: invalidatedApproval ? "needs_review" : String(existing.rights_status),
      material_hash: nextHash,
      note: invalidatedApproval
        ? (evidenceChanged || editionChanged) && !materialChanged
          ? "Catatan, bukti hak atau butiran naskhah berubah selepas kelulusan — semakan hak perlu diulang."
          : "Material provenance berubah selepas kelulusan — semakan hak perlu diulang."
        : undefined,
    });
  }

  if (existing) {
    await db
      .updateTable("source_works")
      .set({
        ...withoutUnusedEdition(next, existing, editionTouched),
        rights_status: invalidatedApproval ? "needs_review" : existing.rights_status,
        reviewed_at: invalidatedApproval ? null : existing.reviewed_at,
        reviewed_by: invalidatedApproval ? null : existing.reviewed_by,
        approved_material_hash: invalidatedApproval ? null : existing.approved_material_hash,
        rights_history: JSON.stringify(history) as never,
        updated_at: nowIso,
      })
      .where("work_id", "=", workId)
      .execute();
  } else {
    await db
      .insertInto("source_works")
      .values({
        work_id: workId,
        ...withoutUnusedEdition(next, existing, editionTouched),
        rights_status: "unknown",
        rights_history: JSON.stringify([
          {
            at: nowIso,
            actor: actorId,
            action: "provenance_edit",
            rights_status: "unknown",
            material_hash: nextHash,
            note: "Rekod provenance sumber dicipta.",
          },
        ] satisfies RightsHistoryEntry[]) as never,
        approved_material_hash: null,
        reviewed_at: null,
        reviewed_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      } as never)
      .execute();
  }

  if (input.chatbotFields && input.chatbotFields.length > 0) {
    const fresh = await db.selectFrom("works").where("id", "=", workId).select("metadata").executeTakeFirst();
    const metadata = { ...((fresh?.metadata ?? {}) as Record<string, unknown>) };
    const have = Array.isArray(metadata.sourceChatbotFields) ? (metadata.sourceChatbotFields as unknown[]).map(String) : [];
    metadata.sourceChatbotFields = [...new Set([...have, ...input.chatbotFields])];
    await db.updateTable("works").where("id", "=", workId).set({ metadata: metadata as never }).execute();
  }

  const view = await getSourceRightsView(workId);
  if (!view) throw new Error("Work tidak ditemui.");
  return { view, invalidatedApproval };
}

export interface RightsReviewInput {
  fragmenTextLanguage?: string | null;
  rights_status: string;
  rights_notes?: string | null;
  rights_evidence?: string | null;
  originalTitle?: string | null;
  author?: string | null;
  originalLanguage?: string | null;
  publicationYear?: number | null;
  sourceEdition?: string | null;
  sourceUrl?: string | null;
  sourceLocator?: string | null;
  sourceTextBasis?: string | null;
  publisher?: string | null;
  editionYear?: number | null;
  printing?: string | null;
  editorName?: string | null;
  translatorName?: string | null;
  isbn?: string | null;
}

/**
 * Explicit human/admin rights review. reviewed_by and reviewed_at are ALWAYS
 * set server-side from the authenticated admin session — never from the client.
 * Does not auto-create public credits.
 */
export async function performRightsReview(
  workId: string,
  input: RightsReviewInput,
  actor: { id: string; email?: string }
): Promise<SourceRightsResult> {
  const db = getDbOrThrow();
  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!work) throw new Error("Work tidak ditemui.");

  const type = String(work.type);
  if (!isSourcedWork(type, work.metadata)) {
    throw new Error(
      `Semakan hak hanya untuk karya bersumber — karya ini jenis "${type}" dan tidak ditanda "daripada sumber lain".`
    );
  }

  const status = String(input.rights_status || "").trim();
  if (!ALL_RIGHTS_STATUSES.includes(status as RightsStatus)) {
    throw new Error(`rights_status tidak sah: "${status}".`);
  }
  if (status === "restricted" || status === "rejected") {
    if (!input.rights_notes || !String(input.rights_notes).trim()) {
      throw new Error("rights_notes wajib untuk status restricted/rejected.");
    }
  }
  if (isPassRightsStatus(status)) {
    if (!input.rights_notes || !String(input.rights_notes).trim()) {
      throw new Error("rights_notes wajib untuk kelulusan hak (PASS).");
    }
  }

  // Allow provenance fields to ride along with the review when provided.
  if (input.sourceUrl !== undefined) {
    const urlCheck = validateSourceUrl(input.sourceUrl);
    if (!urlCheck.ok) throw new Error(urlCheck.reason);
  }

  if (type === "fragmen") {
    await saveFragmenTextLanguage(db, workId, input.fragmenTextLanguage, actor);
  }

  const existing = await loadSourceWork(db, workId);
  const nowIso = new Date().toISOString();
  const reviewer = actor.email || actor.id;

  const merged: SourceWorkRow = {
    id: existing?.id ?? 0,
    work_id: workId,
    original_title:
      input.originalTitle !== undefined ? input.originalTitle : existing?.original_title ?? null,
    author: input.author !== undefined ? input.author : existing?.author ?? null,
    original_language:
      input.originalLanguage !== undefined ? input.originalLanguage : existing?.original_language ?? null,
    publication_year:
      input.publicationYear !== undefined ? input.publicationYear : existing?.publication_year ?? null,
    source_edition:
      input.sourceEdition !== undefined ? input.sourceEdition : existing?.source_edition ?? null,
    source_url: input.sourceUrl !== undefined ? input.sourceUrl : existing?.source_url ?? null,
    source_locator:
      input.sourceLocator !== undefined ? input.sourceLocator : existing?.source_locator ?? null,
    source_text_basis:
      input.sourceTextBasis !== undefined ? input.sourceTextBasis : existing?.source_text_basis ?? null,
    publisher: input.publisher !== undefined ? input.publisher : existing?.publisher ?? null,
    edition_year: input.editionYear !== undefined ? input.editionYear : existing?.edition_year ?? null,
    printing: input.printing !== undefined ? input.printing : existing?.printing ?? null,
    editor_name: input.editorName !== undefined ? input.editorName : existing?.editor_name ?? null,
    translator_name: input.translatorName !== undefined ? input.translatorName : existing?.translator_name ?? null,
    isbn: input.isbn !== undefined ? input.isbn : existing?.isbn ?? null,
    rights_status: status,
    rights_notes:
      input.rights_notes !== undefined ? input.rights_notes : existing?.rights_notes ?? null,
    rights_evidence:
      input.rights_evidence !== undefined ? input.rights_evidence : existing?.rights_evidence ?? null,
    rights_history: existing?.rights_history ?? null,
    approved_material_hash: existing?.approved_material_hash ?? null,
    reviewed_at: existing?.reviewed_at ?? null,
    reviewed_by: existing?.reviewed_by ?? null,
    created_at: existing?.created_at ?? nowIso,
    updated_at: nowIso,
  };

  const editionTouchedReview = [input.publisher, input.editionYear, input.printing, input.editorName, input.translatorName, input.isbn].some((v) => v !== undefined);
  const materialHash = computeMaterialHash(merged);
  const pass = isPassRightsStatus(status);

  // A PASS approval requires complete core provenance.
  if (pass) {
    const missing: string[] = [];
    if (!merged.original_title?.trim()) missing.push("original_title");
    if (!merged.author?.trim()) missing.push("author");
    if (!merged.original_language?.trim()) missing.push("original_language");
    if (missing.length > 0) {
      throw new Error(
        `Kelulusan hak memerlukan provenance lengkap — medan kosong: ${missing.join(", ")}.`
      );
    }
  }

  const history = parseRightsHistory(existing?.rights_history ?? null);
  history.push({
    at: nowIso,
    actor: reviewer,
    action: "review",
    rights_status: status,
    material_hash: materialHash,
    note: input.rights_notes ? String(input.rights_notes).slice(0, 500) : undefined,
  });

  const values = {
    work_id: workId,
    original_title: merged.original_title,
    author: merged.author,
    original_language: merged.original_language,
    publication_year: merged.publication_year,
    source_edition: merged.source_edition,
    source_url: merged.source_url,
    source_locator: merged.source_locator,
    source_text_basis: merged.source_text_basis,
    publisher: merged.publisher ?? null,
    edition_year: merged.edition_year ?? null,
    printing: merged.printing ?? null,
    editor_name: merged.editor_name ?? null,
    translator_name: merged.translator_name ?? null,
    isbn: merged.isbn ?? null,
    rights_status: status,
    rights_notes: merged.rights_notes,
    rights_evidence: merged.rights_evidence,
    rights_history: JSON.stringify(history) as never,
    approved_material_hash: pass ? materialHash : null,
    // Server-controlled review stamps — never taken from client payload.
    reviewed_at: pass ? nowIso : null,
    reviewed_by: pass ? reviewer : null,
    updated_at: nowIso,
  };

  if (existing) {
    await db
      .updateTable("source_works")
      .set(withoutUnusedEdition(values, existing, editionTouchedReview))
      .where("work_id", "=", workId)
      .execute();
  } else {
    await db
      .insertInto("source_works")
      .values({
        ...withoutUnusedEdition(values, existing, editionTouchedReview),
        created_at: nowIso,
      } as never)
      .execute();
  }

  // The editor has now looked at these fields, so they are no longer "suggested by the chatbot".
  {
    const fresh = await db.selectFrom("works").where("id", "=", workId).select("metadata").executeTakeFirst();
    const metadata = { ...((fresh?.metadata ?? {}) as Record<string, unknown>) };
    if (metadata.sourceChatbotFields) {
      delete metadata.sourceChatbotFields;
      await db.updateTable("works").where("id", "=", workId).set({ metadata: metadata as never }).execute();
    }
  }

  const view = await getSourceRightsView(workId);
  if (!view) throw new Error("Work tidak ditemui.");
  return { view, invalidatedApproval: false };
}

/** Reader-safe public provenance projection. Strips all internal fields. */
export function toPublicSourceProvenance(
  row: {
    original_title: string | null;
    author: string | null;
    original_language: string | null;
    publication_year: number | null;
    source_edition: string | null;
    source_locator: string | null;
    rights_status: string;
  } | null
): PublicSourceProvenance | undefined {
  if (!row) return undefined;
  if (!row.original_title && !row.author) return undefined;

  const rightsLabel =
    row.rights_status === "public_domain"
      ? "Domain awam"
      : row.rights_status === "licensed"
        ? "Berlesen"
        : row.rights_status === "permission_obtained"
          ? "Kebenaran diperoleh"
          : undefined;

  return {
    originalTitle: String(row.original_title ?? ""),
    author: String(row.author ?? ""),
    language: row.original_language ? String(row.original_language) : undefined,
    publicationYear: row.publication_year ?? undefined,
    edition: row.source_edition ? String(row.source_edition) : undefined,
    locator: row.source_locator ? String(row.source_locator) : undefined,
    rightsLabel,
  };
}

/**
 * Human confirmation that the displayed text of a Fragmen is Bahasa Melayu. The reviewer and time come
 * from the admin session, and the confirmation is tied to the exact text, so editing the text withdraws it.
 */
export async function confirmFragmenMalayText(
  workId: string,
  confirmed: boolean,
  actor: { id: string; email?: string }
): Promise<SourceRightsAdminView> {
  const db = getDbOrThrow();
  await db.transaction().execute(async (trx) => {
    const work = await trx.selectFrom("works").where("id", "=", workId).selectAll().forUpdate().executeTakeFirst();
    if (!work) throw new Error("Work tidak ditemui.");
    if (work.type !== "fragmen") throw new Error("Pengesahan bahasa hanya untuk Fragmen.");
    const metadata = { ...((work.metadata ?? {}) as Record<string, unknown>) };
    if (confirmed) {
      metadata.fragmenTextReview = {
        reviewedBy: actor.email || actor.id,
        reviewedAt: new Date().toISOString(),
        textHash: fragmenTextHash(work.body),
      };
    } else {
      delete metadata.fragmenTextReview;
    }
    await trx.updateTable("works").where("id", "=", workId)
      .set({ metadata: metadata as never, updated_at: new Date().toISOString() })
      .execute();
  });
  const view = await getSourceRightsView(workId);
  if (!view) throw new Error("Work tidak ditemui.");
  return view;
}
