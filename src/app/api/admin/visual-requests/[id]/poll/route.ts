import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import {
  createMagnificAdapter,
  createMockVisualAdapter,
  pollVisualGeneration,
} from "../../../../../../lib/admin/visual-generation";

/**
 * POST /api/admin/visual-requests/[id]/poll
 *
 * Bounded polling fallback for async Magnific tasks (webhook is primary).
 * Single bounded pass per call — no continuous spin loops.
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

    const body = await request.json().catch(() => ({}));
    const provider =
      typeof body?.provider === "string" && body.provider ? body.provider : "magnific";

    let adapter;
    if (provider === "mock") {
      adapter = createMockVisualAdapter();
    } else if (provider === "magnific") {
      adapter = createMagnificAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "MAGNIFIC_API_KEY tidak dikonfigurasi." },
          { status: 503 }
        );
      }
    } else {
      return NextResponse.json({ error: "Provider tidak disokong." }, { status: 400 });
    }

    const db = getDb();
    const result = await pollVisualGeneration(db, numId, adapter, {
      maxAttempts: 1,
      delayMs: 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
