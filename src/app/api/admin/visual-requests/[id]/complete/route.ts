import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import {
  completeVisualGeneration,
} from "../../../../../../lib/admin/visual-generation";

/**
 * POST /api/admin/visual-requests/[id]/complete
 *
 * Authenticated Magnific connector completion path (ChatGPT → Magnific → Jalin).
 *
 * Protected by admin session middleware (/api/admin/*).
 * Converges on the SAME completeVisualGeneration service as API/webhook paths.
 *
 * NEVER auto-approves, auto-attaches, or publishes.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body diperlukan." }, { status: 400 });
    }

    const {
      provider,
      executionMode,
      providerTaskId,
      providerCreationId,
      providerAssetUrl,
      width,
      height,
      mimeType,
    } = body as Record<string, unknown>;

    // Strict validation — reject arbitrary provider / mode.
    if (provider !== "magnific") {
      return NextResponse.json(
        { error: "provider mesti 'magnific'." },
        { status: 400 }
      );
    }
    if (executionMode !== "magnific_connector") {
      return NextResponse.json(
        { error: "executionMode mesti 'magnific_connector'." },
        { status: 400 }
      );
    }
    if (typeof providerAssetUrl !== "string" || !providerAssetUrl.trim()) {
      return NextResponse.json(
        { error: "providerAssetUrl diperlukan." },
        { status: 400 }
      );
    }
    if (
      providerAssetUrl.startsWith("javascript:") ||
      (!providerAssetUrl.startsWith("https://") && !providerAssetUrl.startsWith("http://"))
    ) {
      return NextResponse.json({ error: "providerAssetUrl tidak sah." }, { status: 400 });
    }

    const widthNum =
      typeof width === "number" && Number.isFinite(width) ? width : null;
    const heightNum =
      typeof height === "number" && Number.isFinite(height) ? height : null;
    const mime =
      typeof mimeType === "string" && mimeType.trim() ? mimeType.trim() : "image/png";
    const taskId =
      typeof providerTaskId === "string" && providerTaskId.trim()
        ? providerTaskId.trim()
        : null;
    const creationId =
      typeof providerCreationId === "string" && providerCreationId.trim()
        ? providerCreationId.trim()
        : null;

    const db = getDb();
    const result = await completeVisualGeneration(db, {
      visualRequestId: numId,
      provider: "magnific",
      executionMode: "magnific_connector",
      providerTaskId: taskId,
      providerCreationId: creationId,
      providerAssetUrl: providerAssetUrl.trim(),
      width: widthNum,
      height: heightNum,
      mimeType: mime,
      source: "connector",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Completion gagal." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent ?? false,
      requestId: result.requestId,
      status: result.status,
      approvalState: result.approvalState,
      assetFinalized: result.assetFinalized,
      stableAssetPath: result.stableAssetPath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
