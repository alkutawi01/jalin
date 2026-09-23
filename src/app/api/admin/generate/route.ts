import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { executeGeneration, createOpenAIAdapter, createMockAdapter } from "../../../../lib/admin/generation";
import type { WorkType } from "../../../../lib/db/types";

/**
 * POST /api/admin/generate
 *
 * Trigger AI text generation for a submission.
 * Body: { submissionId, provider, model, promptTemplateId?, submissionBrief, submissionTitle?, workType? }
 *
 * Requires: admin auth (via middleware)
 * Returns: { requestId, status, manuscript?, errorCategory?, errorMessage? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submissionId,
      provider,
      model,
      promptTemplateId,
      submissionBrief,
      submissionTitle,
      workType,
    } = body;

    if (!submissionId || typeof submissionId !== "number") {
      return NextResponse.json({ error: "submissionId diperlukan." }, { status: 400 });
    }
    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider diperlukan." }, { status: 400 });
    }
    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "model diperlukan." }, { status: 400 });
    }
    if (!submissionBrief || typeof submissionBrief !== "string") {
      return NextResponse.json({ error: "submissionBrief diperlukan." }, { status: 400 });
    }

    // Select adapter based on provider
    let adapter;
    if (provider === "mock") {
      adapter = createMockAdapter();
    } else if (provider === "openai") {
      adapter = createOpenAIAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY tidak dikonfigurasi." },
          { status: 503 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Provider '${provider}' belum disokong.` },
        { status: 400 }
      );
    }

    // Validate model
    if (!adapter.validateModel(model)) {
      return NextResponse.json(
        { error: `Model '${model}' tidak disokong oleh ${provider}.` },
        { status: 400 }
      );
    }

    const db = getDb();

    // Generate idempotency key
    const idempotencyKey = `gen-${submissionId}-${provider}-${model}-${Date.now()}`;

    const result = await executeGeneration(db, {
      submissionId,
      provider,
      model,
      requestedBy: "admin",
      promptTemplateId: promptTemplateId ?? undefined,
      submissionBrief,
      submissionTitle: submissionTitle ?? undefined,
      workType: (workType as WorkType) ?? undefined,
      idempotencyKey,
    }, adapter);

    return NextResponse.json({
      requestId: result.requestId,
      status: result.status,
      manuscript: result.manuscript,
      errorCategory: result.errorCategory,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
