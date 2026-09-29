import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { hasDb } from "../../../../../lib/db";
import { slugExists } from "../../../../../lib/admin/work-service";
import { importPlanAsDraft } from "../../../../../lib/admin/import/import-service";
import { buildImportPlan, type ImportPlan } from "../../../../../lib/admin/import/plan";
import type { ImportIssue } from "../../../../../lib/admin/import/parser-output";

const MAX_ANSWER_CHARS = 400_000;
const MAX_MANUSCRIPT_CHARS = 1_500_000;

function summarise(plan: ImportPlan) {
  return {
    work: plan.work,
    stats: plan.stats,
    credits: plan.credits,
    characters: plan.characters,
    glossary: plan.glossary.map((g) => g.term),
    sections: plan.sections.map((s) => ({
      slug: s.slug,
      title: s.title,
      position: s.position,
      words: s.words,
      start: s.body.slice(0, 90),
      end: s.body.slice(-90)
    })),
    source: plan.source,
    locations: plan.locations,
    themes: plan.themes,
    visuals: plan.visuals.map((v) => ({
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      answer?: unknown;
      manuscript?: unknown;
      dryRun?: unknown;
      slugOverride?: unknown;
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

    const result = buildImportPlan(answer, manuscript, { slugOverride });
    const errors: ImportIssue[] = [...result.errors];
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
        message: "Pangkalan data tidak tersedia (DATABASE_URL). Semakan berfungsi, tetapi draf tidak boleh dicipta."
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
        visualRequests: created.visualRequests
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 500 });
  }
}
