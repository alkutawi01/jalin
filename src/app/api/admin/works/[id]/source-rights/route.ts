import { NextRequest, NextResponse } from "next/server";
import {
  getSourceRightsView,
  upsertSourceProvenance,
} from "../../../../../../lib/admin/source-rights";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const view = await getSourceRightsView(id);
    if (!view) {
      return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    }
    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // reviewed_by / reviewed_at are NEVER accepted from the client.
    const result = await upsertSourceProvenance(
      id,
      {
        originalTitle: body.originalTitle ?? null,
        author: body.author ?? null,
        originalLanguage: body.originalLanguage ?? null,
        publicationYear:
          body.publicationYear === null || body.publicationYear === undefined || body.publicationYear === ""
            ? null
            : Number(body.publicationYear),
        sourceEdition: body.sourceEdition ?? null,
        sourceUrl: body.sourceUrl ?? null,
        sourceLocator: body.sourceLocator ?? null,
        sourceTextBasis: body.sourceTextBasis ?? null,
        rightsNotes: body.rightsNotes ?? null,
        rightsEvidence: body.rightsEvidence ?? null,
      },
      { id: admin.id, email: admin.email }
    );

    return NextResponse.json({
      ...result.view,
      invalidatedApproval: result.invalidatedApproval,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("hanya untuk") || message.includes("source_url")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
