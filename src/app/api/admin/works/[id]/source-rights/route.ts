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
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // reviewed_by / reviewed_at are NEVER accepted from the client.
    // A field that is not in the body is left as it is; only an explicit null or "" clears it.
    const opt = (v: unknown) => (v === undefined ? undefined : v ?? null);
    const year = (v: unknown) => (v === undefined ? undefined : v === null || v === "" ? null : Number(v));
    const result = await upsertSourceProvenance(
      id,
      {
        fragmenTextLanguage: body.fragmenTextLanguage,
        originalTitle: opt(body.originalTitle) as string | null | undefined,
        author: opt(body.author) as string | null | undefined,
        originalLanguage: opt(body.originalLanguage) as string | null | undefined,
        publicationYear: year(body.publicationYear),
        sourceEdition: opt(body.sourceEdition) as string | null | undefined,
        sourceUrl: opt(body.sourceUrl) as string | null | undefined,
        sourceLocator: opt(body.sourceLocator) as string | null | undefined,
        sourceTextBasis: opt(body.sourceTextBasis) as string | null | undefined,
        publisher: opt(body.publisher) as string | null | undefined,
        editionYear: year(body.editionYear),
        printing: opt(body.printing) as string | null | undefined,
        editorName: opt(body.editorName) as string | null | undefined,
        translatorName: opt(body.translatorName) as string | null | undefined,
        isbn: opt(body.isbn) as string | null | undefined,
        chatbotFields: Array.isArray(body.chatbotFields) ? body.chatbotFields.map(String) : undefined,
        rightsNotes: opt(body.rightsNotes) as string | null | undefined,
        rightsEvidence: opt(body.rightsEvidence) as string | null | undefined,
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
      : message.includes("hanya untuk") || message.includes("source_url") || message.includes("Bahasa petikan")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
