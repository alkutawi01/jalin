import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";

/**
 * GET /api/admin/generate/history?submissionId=X
 *
 * List generation requests for a submission.
 * Returns full admin data (internal fields visible).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId diperlukan." }, { status: 400 });
    }

    const numId = parseInt(submissionId, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "submissionId tidak sah." }, { status: 400 });
    }

    const db = getDb();

    const requests = await db
      .selectFrom("generation_requests")
      .where("submission_id", "=", numId)
      .orderBy("created_at", "desc")
      .select([
        "id",
        "submission_id",
        "prompt_template_id",
        "provider",
        "model",
        "status",
        "requested_by",
        "provider_request_id",
        "token_input",
        "token_output",
        "token_total",
        "estimated_cost_cents",
        "currency",
        "error_category",
        "error_message",
        "result_manuscript",
        "idempotency_key",
        "started_at",
        "completed_at",
        "failed_at",
        "created_at",
      ])
      .execute();

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
