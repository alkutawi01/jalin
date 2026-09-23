import { NextRequest, NextResponse } from "next/server";
import { listContributionsForSubmission } from "../../../../lib/admin/contribution-service";
import { toPublicProjection, verifyPrivacyBoundary } from "../../../../lib/admin/identity-handshake";

/**
 * GET /api/public/contributions?submissionId=X
 *
 * Public-safe endpoint for contribution data.
 * Returns ONLY public projection — all internal AI identity fields are stripped.
 *
 * This endpoint proves the privacy boundary: internal identity fields
 * (provider, model, persona, actual_role, identity_source) are NEVER exposed.
 *
 * SECURITY: No auth required — this is a public API.
 * All data returned is safe for public consumption.
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

    const contributions = await listContributionsForSubmission(numId);

    // Project to public-safe format — strips all internal AI identity fields
    const publicContributions = contributions.map(toPublicProjection);

    // Verify privacy boundary — ensure no internal fields leaked
    for (const projection of publicContributions) {
      const privacyCheck = verifyPrivacyBoundary(projection);
      if (!privacyCheck.isPrivate) {
        // This should never happen if toPublicProjection is correct
        console.error(
          `[PrivacyViolation] Internal fields leaked in public API: ${privacyCheck.leakedFields.join(", ")}`
        );
        return NextResponse.json(
          { error: "Ralat privasi dalaman." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(publicContributions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
