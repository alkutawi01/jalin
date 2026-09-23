import { NextRequest, NextResponse } from "next/server";
import { registerIdentityHandshake } from "../../../../../../lib/admin/contribution-service";

/**
 * POST /api/admin/contributions/[id]/handshake
 *
 * Register an identity handshake against a submission contribution.
 * Validates the handshake payload and stores it.
 *
 * This is the entry point for Phase 4D-3 generation orchestration.
 * No external provider is called — pure validation and storage.
 *
 * SECURITY: Admin-only endpoint. Internal identity fields are stored here
 * and must never be exposed through public APIs.
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

    // Validate required fields
    if (!body.provider?.trim()) {
      return NextResponse.json({ error: "provider diperlukan." }, { status: 400 });
    }
    if (!body.model?.trim()) {
      return NextResponse.json({ error: "model diperlukan." }, { status: 400 });
    }
    if (!body.actualRole?.trim()) {
      return NextResponse.json({ error: "actualRole diperlukan." }, { status: 400 });
    }
    if (!body.identitySource) {
      return NextResponse.json({ error: "identitySource diperlukan." }, { status: 400 });
    }

    const contribution = await registerIdentityHandshake(numId, {
      provider: body.provider.trim(),
      model: body.model.trim(),
      publicPersona: body.publicPersona,
      actualRole: body.actualRole.trim(),
      identitySource: body.identitySource,
      runtimeVerification: body.runtimeVerification,
    });

    return NextResponse.json(contribution);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("validation failed") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
