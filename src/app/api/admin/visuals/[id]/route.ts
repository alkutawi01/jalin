import { NextRequest, NextResponse } from "next/server";
import { getVisual, updateVisual, deleteVisual } from "../../../../../lib/admin/visual-service";
import { getDb } from "../../../../../lib/db";
import { isImageMarker } from "../../../../../lib/reader/image-markers";
import { parseDbId } from "../../../../../lib/admin/ids";

/** undefined leaves the field alone; null or "" clears it; anything else must be a number. */
function numOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visualId = parseDbId(id);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const visual = await getVisual(visualId);

    if (!visual) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(visual);
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
    const visualId = parseDbId(id);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if visual exists
    const existing = await getVisual(visualId);
    if (!existing) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    // Validate role if provided
    if (body.role) {
      const validRoles = ["hero", "inline", "section", "decorative"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "role tidak sah." }, { status: 400 });
      }
    }

    const role = body.role ?? existing.role;
    if (role !== "hero" && isImageMarker(body.anchor)) {
      const marker = String(body.anchor).trim();
      // A picture that belongs to a chapter keeps its marker in that chapter's text, not in the work's main text.
      const sectionSlug: string | null = (existing as { section_slug?: string | null }).section_slug ?? null;
      const text = sectionSlug
        ? (await getDb().selectFrom("reading_sections").where("work_id", "=", existing.work_id).where("slug", "=", sectionSlug).select("body").executeTakeFirst())?.body
        : (await getDb().selectFrom("works").where("id", "=", existing.work_id).select("body").executeTakeFirst())?.body;
      if (text?.split(marker).length !== 2) {
        return NextResponse.json({ error: "Penanda gambar mesti muncul tepat sekali dalam manuskrip tersimpan." }, { status: 400 });
      }
      const assigned = await getDb().selectFrom("visuals")
        .where("work_id", "=", existing.work_id).where("anchor", "=", marker).where("id", "!=", visualId)
        .select("id").executeTakeFirst();
      if (assigned) return NextResponse.json({ error: "Penanda ini sudah digunakan oleh gambar lain." }, { status: 409 });
    }

    const visual = await updateVisual(visualId, {
      role: body.role,
      src: body.src,
      alt: body.alt,
      provider: body.provider,
      creationId: body.creationId,
      anchor: body.anchor,
      place: body.place,
      sortOrder: body.sortOrder,
      focusX: numOrNull(body.focusX),
      focusY: numOrNull(body.focusY),
      zoom: numOrNull(body.zoom),
    });

    return NextResponse.json(visual);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    // The crop columns come with migration 022; until it has run, say so instead of showing a database error.
    if (/column .*(focus_x|focus_y|zoom|section_slug).* does not exist/i.test(message)) {
      return NextResponse.json({ error: "Pilihan bahagian gambar (crop) memerlukan migration 022 pada pangkalan data. Hubungi pentadbir untuk menjalankannya." }, { status: 409 });
    }
    return NextResponse.json(
      { error: message },
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
    const visualId = parseDbId(id);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if visual exists
    const existing = await getVisual(visualId);
    if (!existing) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    await deleteVisual(visualId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
