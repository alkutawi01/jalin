import { NextRequest, NextResponse } from "next/server";
import { performRightsReview } from "../../../../../../../lib/admin/source-rights";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";

/**
 * Explicit human/admin rights review.
 * reviewed_by and reviewed_at are ALWAYS set server-side from the admin session.
 * Client payload cannot forge review stamps.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.rights_status) {
      return NextResponse.json({ error: "rights_status diperlukan." }, { status: 400 });
    }

    // Strip any client-supplied review stamps — never trusted.
    const result = await performRightsReview(
      id,
      {
        rights_status: String(body.rights_status),
        rights_notes: body.rights_notes ?? null,
        rights_evidence: body.rights_evidence ?? null,
        originalTitle: body.originalTitle,
        author: body.author,
        originalLanguage: body.originalLanguage,
        publicationYear:
          body.publicationYear === null || body.publicationYear === undefined || body.publicationYear === ""
            ? undefined
            : Number(body.publicationYear),
        sourceEdition: body.sourceEdition,
        sourceUrl: body.sourceUrl,
        sourceLocator: body.sourceLocator,
        sourceTextBasis: body.sourceTextBasis,
      },
      { id: admin.id, email: admin.email }
    );

    return NextResponse.json(result.view);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("wajib") || message.includes("tidak sah") || message.includes("hanya untuk") || message.includes("memerlukan")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
