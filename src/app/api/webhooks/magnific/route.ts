import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import {
  verifyWebhookSignature,
  extractWebhookHeaders,
  completeVisualGeneration,
  failVisualGeneration,
  parseAttemptHistory,
} from "../../../../lib/admin/visual-generation";
import type { VisualExecutionMode } from "../../../../lib/admin/visual-generation";

/**
 * POST /api/webhooks/magnific
 *
 * Magnific official async task callbacks.
 * Auth: cryptographic HMAC-SHA256 verification (NOT admin browser session).
 *
 * Content signed: `${webhook-id}.${webhook-timestamp}.${rawBody}`
 * Header: webhook-signature (space-delimited `version,signature` pairs)
 *
 * Idempotent on webhook-id + task state.
 * NEVER approves, attaches, or publishes.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headers = extractWebhookHeaders((name) => request.headers.get(name));

    const secret = process.env.MAGNIFIC_WEBHOOK_SECRET;
    const verification = verifyWebhookSignature(headers, rawBody, secret);

    if (!verification.ok) {
      // Fail closed. Do not leak verification internals.
      const status =
        verification.reason === "missing_secret" ? 503 : 401;
      return NextResponse.json(
        { error: "Webhook verification failed." },
        { status }
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    // Accept { data: task } or bare task shape (official docs: payload equals
    // GET task response without the data field wrapper — handle both).
    const task =
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : payload;

    const taskId =
      (typeof task.task_id === "string" && task.task_id) ||
      (typeof task.taskId === "string" && task.taskId) ||
      null;

    if (!taskId) {
      return NextResponse.json({ error: "Missing task_id." }, { status: 400 });
    }

    const db = getDb();

    // Locate visual request by provider task id.
    const vr = await db
      .selectFrom("visual_requests")
      .where("provider_request_id", "=", taskId)
      .selectAll()
      .executeTakeFirst();

    if (!vr) {
      // Unknown task — acknowledge without processing (avoid retry storms).
      return NextResponse.json({ received: true, matched: false });
    }

    // Idempotent: already processed this webhook id.
    if (vr.last_webhook_id === verification.webhookId) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Also idempotent if already under_review for this task and not a failure.
    const status = String(
      (task.status as string | undefined) ?? ""
    ).toUpperCase();
    const generatedRaw = task.generated;
    const generated = Array.isArray(generatedRaw)
      ? generatedRaw.filter((u): u is string => typeof u === "string" && u.length > 0)
      : [];

    const executionMode: VisualExecutionMode =
      (vr.execution_mode as VisualExecutionMode) || "magnific_api";

    if (status === "FAILED" || status === "CANCELLED" || status === "ERROR") {
      await failVisualGeneration(db, {
        visualRequestId: vr.id,
        error: new Error("Magnific webhook reported task failure."),
        executionMode,
        providerTaskId: taskId,
        webhookId: verification.webhookId,
      });
      return NextResponse.json({ received: true, outcome: "failed" });
    }

    if (status !== "COMPLETED" && status !== "SUCCEEDED" && status !== "SUCCESS") {
      // Intermediate status (CREATED / IN_PROGRESS) — record and acknowledge.
      const attempts = parseAttemptHistory(vr.attempt_history);
      attempts.push({
        at: new Date().toISOString(),
        mode: "webhook",
        taskId,
        webhookId: verification.webhookId,
        status: status || "in_progress",
      });
      await db
        .updateTable("visual_requests")
        .set({
          attempt_history: JSON.stringify(attempts) as never,
          last_webhook_id: verification.webhookId,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", vr.id)
        .execute();
      return NextResponse.json({ received: true, outcome: "progress" });
    }

    if (generated.length === 0) {
      return NextResponse.json(
        { error: "Completed task missing generated URLs." },
        { status: 400 }
      );
    }

    const completion = await completeVisualGeneration(db, {
      visualRequestId: vr.id,
      provider: "magnific",
      executionMode,
      providerTaskId: taskId,
      providerCreationId: vr.provider_creation_id,
      providerAssetUrl: generated[0],
      mimeType: "image/png",
      webhookId: verification.webhookId,
      source: "webhook",
    });

    if (!completion.success) {
      return NextResponse.json(
        { error: "Completion failed." },
        { status: 409 }
      );
    }

    // NEVER approve / attach / publish from webhook.
    return NextResponse.json({
      received: true,
      outcome: completion.idempotent ? "idempotent" : "completed",
      status: completion.status,
      approvalState: completion.approvalState,
    });
  } catch {
    // Never expose internals.
    return NextResponse.json({ error: "Webhook processing error." }, { status: 500 });
  }
}
