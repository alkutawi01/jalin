import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import { promoteSubmissionToWork } from "../../../../../../lib/admin/promotion-service";
import type { PromotionCreditConfig } from "../../../../../../lib/admin/promotion-service";

/**
 * POST /api/admin/submissions/[id]/promote
 *
 * Promote an approved submission to a canonical Work.
 * Atomic transaction — rollback on any failure.
 *
 * Body: { slug?, status?, credits: PromotionCreditConfig[], promotedBy? }
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
    const { slug, status, credits, promotedBy } = body;

    if (!credits || !Array.isArray(credits)) {
      return NextResponse.json(
        { error: "credits diperlukan (array)." },
        { status: 400 }
      );
    }

    // Validate credit config structure
    for (const credit of credits) {
      if (typeof credit.contributionId !== "number") {
        return NextResponse.json(
          { error: "Setiap credit mesti mempunyai contributionId." },
          { status: 400 }
        );
      }
      if (typeof credit.include !== "boolean") {
        return NextResponse.json(
          { error: "Setiap credit mesti mempunyai include (boolean)." },
          { status: 400 }
        );
      }
      if (!credit.roleLabel || typeof credit.roleLabel !== "string") {
        return NextResponse.json(
          { error: "Setiap credit mesti mempunyai roleLabel." },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    const result = await promoteSubmissionToWork(db, {
      submissionId: numId,
      slug: slug || undefined,
      status: status || undefined,
      credits: credits as PromotionCreditConfig[],
      promotedBy: promotedBy || "admin",
    });

    return NextResponse.json({
      workId: result.workId,
      slug: result.slug,
      status: result.status,
      promotedCreditCount: result.promotedCreditCount,
      warnings: result.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
