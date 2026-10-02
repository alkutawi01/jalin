import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { hasDb } from "../../../../../lib/db";
import { slugExists } from "../../../../../lib/admin/work-service";
import { importPlanAsDraft } from "../../../../../lib/admin/import/import-service";
import { buildImportPlan, type ImportOptions, type ImportPlan } from "../../../../../lib/admin/import/plan";
import type { ImportIssue } from "../../../../../lib/admin/import/parser-output";

const MAX_ANSWER_CHARS = 400_000;
const MAX_MANUSCRIPT_CHARS = 1_500_000;

function summarise(plan: ImportPlan) {
  return {
    work: plan.work,
    stats: plan.stats,
    credits: plan.credits,
    characters: plan.characters,
    glossary: plan.glossary.map((g) => ({ term: g.term, meaning: g.meaning })),
    sections: plan.sections.map((s) => ({
      slug: s.slug,
      title: s.title,
      position: s.position,
      words: s.words,
      start: s.body.slice(0, 90),
      end: s.body.slice(-90)
    })),
    source: plan.source,
    series: plan.series,
    locations: plan.locations,
    themes: plan.themes,
    visuals: plan.visuals.map((v) => ({
      originalIndex: v.originalIndex,
      scenePrompt: v.scenePrompt,
      role: v.role,
      sectionSlug: v.sectionSlug,
      place: v.place,
      aspectRatio: v.aspectRatio,
      altText: v.altText,
      anchorStart: v.anchor ? v.anchor.slice(0, 90) : null,
      finalPrompt: v.finalPrompt,
      reason: v.reason
    }))
  };
}

/**
 * POST /api/admin/works/import
 * Body: { answer, manuscript, dryRun?, slugOverride? }
 * dryRun (default true) only validates and previews. dryRun:false creates
 * a DRAFT work in one transaction. Never publishes.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const body = (await request.json()) as {
      answer?: unknown;
      manuscript?: unknown;
      dryRun?: unknown;
      slugOverride?: unknown;
      mode?: unknown;
      overrides?: unknown;
      writerName?: unknown;
      edits?: unknown;
      series?: unknown;
      expectedType?: unknown;
    };
    const answer = typeof body.answer === "string" ? body.answer : "";
    const manuscript = typeof body.manuscript === "string" ? body.manuscript : "";
    const dryRun = body.dryRun !== false;
    const slugOverride = typeof body.slugOverride === "string" ? body.slugOverride : undefined;

    if (answer.length > MAX_ANSWER_CHARS || manuscript.length > MAX_MANUSCRIPT_CHARS) {
      return NextResponse.json({ error: "Input terlalu besar." }, { status: 413 });
    }
    if (!answer.trim()) {
      return NextResponse.json({ error: "Output parser belum ditampal." }, { status: 400 });
    }

    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const ov = (body.overrides && typeof body.overrides === "object" ? body.overrides : {}) as Record<string, unknown>;
    const sr = (body.series && typeof body.series === "object" ? body.series : null) as Record<string, unknown> | null;
    const options: ImportOptions = {
      mode: body.mode === "tulis" ? "tulis" : "data",
      slugOverride,
      overrides: { title: str(ov.title), slug: str(ov.slug), dek: str(ov.dek), genre: str(ov.genre) },
      writerName: str(body.writerName),
      edits: body.edits && typeof body.edits === "object" ? (body.edits as ImportOptions["edits"]) : undefined,
      series:
        sr?.kind === "sambung" && typeof sr.seriesId === "string"
          ? { kind: "sambung", seriesId: sr.seriesId }
          : sr?.kind === "baharu"
            ? { kind: "baharu", title: str(sr.title), dek: str(sr.dek), mode: sr.mode === "anthology" ? "anthology" : undefined }
            : undefined
    };
    const result = buildImportPlan(answer, manuscript, options);
    const errors: ImportIssue[] = [...result.errors];
    // The kind is chosen when the editor starts; the chatbot's answer may not change it silently.
    const expectedType = typeof body.expectedType === "string" ? body.expectedType : null;
    if (result.plan && expectedType && result.plan.work.type !== expectedType) {
      errors.push({
        code: "type_mismatch",
        message: `Anda memilih jenis ${expectedType}, tetapi jawapan chatbot menyebut ${result.plan.work.type}. Jenis tidak ditukar secara senyap. Minta chatbot menjawab semula untuk ${expectedType}, atau mulakan semula dengan jenis yang betul.`,
        path: "type"
      });
    }
    const warnings: ImportIssue[] = [...result.warnings];

    if (result.plan && hasDb()) {
      if (await slugExists(result.plan.work.slug)) {
        errors.push({
          code: "slug_exists",
          message: `Slug "${result.plan.work.slug}" sudah digunakan. Tukar slug di bawah atau padam karya sedia ada.`,
          path: "slug"
        });
      }
    } else if (result.plan && !hasDb()) {
      warnings.push({
        code: "db_unavailable",
        message: "Pangkalan data tidak tersedia. Semakan berfungsi, tetapi draf tidak boleh dicipta."
      });
    }

    if (!result.plan || errors.length > 0) {
      return NextResponse.json(
        { ok: false, dryRun, errors, warnings, report: result.report, plan: result.plan ? summarise(result.plan) : null },
        { status: 422 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        errors: [],
        warnings,
        report: result.report,
        plan: summarise(result.plan),
        canCreate: hasDb()
      });
    }

    if (!hasDb()) {
      return NextResponse.json(
        { ok: false, errors: [{ code: "db_unavailable", message: "Pangkalan data tidak tersedia." }], warnings },
        { status: 503 }
      );
    }

    const created = await importPlanAsDraft(result.plan, { id: admin.id, email: admin.email });
    return NextResponse.json(
      {
        ok: true,
        dryRun: false,
        workId: created.workId,
        slug: created.slug,
        warnings: [...warnings.map((w) => w.message), ...created.postWarnings],
        // Only the problems found while saving; the rest were already shown during the check.
        postWarnings: created.postWarnings,
        visualRequests: created.visualRequests
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 500 });
  }
}
