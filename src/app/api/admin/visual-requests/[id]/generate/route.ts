import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import {
  executeVisualGeneration,
  createMagnificAdapter,
  createMockVisualAdapter,
} from "../../../../../../lib/admin/visual-generation";

/**
 * POST /api/admin/visual-requests/[id]/generate
 *
 * Trigger visual generation for a visual request via provider adapter.
 * Body: { provider, model?, editorialOverride? }
 *
 * Requires: admin auth (via middleware)
 * Returns: generation result with provenance.
 *
 * Generation ≠ Approval. Never auto-approves or auto-attaches.
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

    const body = await request.json();
    const { provider, model, editorialOverride } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider diperlukan." }, { status: 400 });
    }

    // Select adapter
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
      return NextResponse.json(
        { error: `Provider '${provider}' belum disokong. Gunakan 'magnific' atau 'mock'.` },
        { status: 400 }
      );
    }

    if (model && !adapter.validateModel(model)) {
      return NextResponse.json(
        { error: `Model '${model}' tidak disokong oleh ${provider}.` },
        { status: 400 }
      );
    }

    const db = getDb();
    const idempotencyKey = `vis-${numId}-${provider}-${model || "default"}-${Date.now()}`;

    const result = await executeVisualGeneration(
      db,
      {
        visualRequestId: numId,
        provider,
        model: model ?? undefined,
        requestedBy: "admin",
        editorialOverride: editorialOverride ?? null,
        idempotencyKey,
      },
      adapter
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
