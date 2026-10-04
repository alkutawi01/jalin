import { NextRequest, NextResponse } from "next/server";
import { getCredit, updateCredit, deleteCredit, listCreditsForWork } from "../../../../../lib/admin/credit-service";
import { findDuplicateCredit } from "../../../../../lib/admin/metadata-rules";
import { parseDbId } from "../../../../../lib/admin/ids";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditId = parseDbId(id);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const credit = await getCredit(creditId);

    if (!credit) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(credit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditId = parseDbId(id);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if credit exists
    const existing = await getCredit(creditId);
    if (!existing) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    // What the credit will be after this change, to be sure it does not repeat another credit of the same work.
    const nextSlug = body.contributorSlug !== undefined ? body.contributorSlug || null : body.guestName ? null : existing.contributor_slug;
    const nextGuest = body.guestName !== undefined ? body.guestName || null : body.contributorSlug ? null : existing.guest_name;
    const duplicate = findDuplicateCredit(await listCreditsForWork(existing.work_id), {
      contributorSlug: nextSlug,
      guestName: nextGuest,
      roleLabel: String(body.roleLabel ?? existing.role_label).trim(),
    }, creditId);
    if (duplicate) {
      return NextResponse.json({ error: `Kredit ini sudah ada: ${duplicate.contributor_slug ?? duplicate.guest_name} sebagai ${duplicate.role_label}.` }, { status: 409 });
    }

    const credit = await updateCredit(creditId, {
      contributorSlug: body.contributorSlug,
      guestName: body.guestName,
      roleLabel: body.roleLabel,
      byline: body.byline,
      isPublic: body.isPublic,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(credit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditId = parseDbId(id);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if credit exists
    const existing = await getCredit(creditId);
    if (!existing) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    await deleteCredit(creditId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
