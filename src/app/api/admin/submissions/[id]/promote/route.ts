import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import { promoteSubmissionToWork } from "../../../../../../lib/admin/promotion-service";
import type { PromotionCreditConfig } from "../../../../../../lib/admin/promotion-service";
import { parseDbId } from "../../../../../../lib/admin/ids";

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
    const numId = parseDbId(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const body = await request.json();
    const { slug, status, credits, promotedBy } = body;

    // A promoted work starts as a draft, in review or ready; it is published only by the publish button, after the readiness and rights checks.
    if (status !== undefined && status !== null && !["draft", "review", "ready"].includes(String(status))) {
      return NextResponse.json({ error: "Status tidak sah: karya yang dinaikkan hanya boleh bermula sebagai draf, semakan atau sedia. Penerbitan dibuat melalui butang Terbitkan." }, { status: 400 });
    }

    if (!credits || !Array.isArray(credits)) {
      return NextResponse.json(
        { error: "Senarai kredit diperlukan." },
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
    return NextResponse.json({ error: message }, { status: message.startsWith("Status tidak sah") ? 400 : 500 });
  }
}
