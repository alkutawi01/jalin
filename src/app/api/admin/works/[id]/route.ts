import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWork, archiveWork, deleteUnpublishedWork } from "../../../../../lib/admin/work-service";
import { conflictMessage, reconcileEdit, storedFormValues } from "../../../../../lib/admin/stale-write";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../lib/db";
import { imageMarkers, isImageMarker } from "../../../../../lib/reader/image-markers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const work = await getWork(id);

    if (!work) {
      return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(work);
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
    const body = await request.json();

    // Check if work exists
    const existing = await getWork(id);
    if (!existing) {
      return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    }

    // A form that loaded an older copy must not wipe what another tab saved since (see stale-write.ts).
    const stale = reconcileEdit(body.base, body, storedFormValues(existing));
    if (stale.conflicts.length > 0) {
      return NextResponse.json({ error: conflictMessage(stale.conflicts), conflict: stale.conflicts }, { status: 409 });
    }
    // Fields the editor did not touch are not written back (and not validated: they may be an older copy of the text).
    for (const field of stale.skip) delete body[field];

    if (typeof body.body === "string" && hasDb()) {
      const markers = imageMarkers(body.body);
      for (const marker of markers) {
        if (body.body.split(marker).length !== 2) {
          return NextResponse.json({ error: `Penanda ${marker} berulang. Setiap penanda gambar mesti unik.` }, { status: 400 });
        }
      }
      // A chapter's picture has its marker in that chapter's text, not in this body (a novela's body is empty), so only the
      // work's own pictures are checked here. Before, saving a novela's details failed as soon as one chapter had a picture.
      const attached = await getDb().selectFrom("visuals").where("work_id", "=", id).where("section_slug", "is", null).select("anchor").execute();
      for (const visual of attached) {
        if (isImageMarker(visual.anchor) && !markers.includes(visual.anchor!)) {
          return NextResponse.json({ error: `Penanda ${visual.anchor} masih digunakan oleh gambar. Alihkannya, jangan padam; atau padam gambar itu dahulu.` }, { status: 400 });
        }
      }
    }

    // Once public, the address is what readers, search engines and shared links hold; the next "Terbitkan semula" would turn the old one into a 404.
    if (body.slug !== undefined && body.slug !== existing.slug && (existing.published_revision_id || existing.published_at || existing.status === "published")) {
      return NextResponse.json({ error: "Alamat pautan karya yang pernah diterbitkan tidak boleh ditukar: pautan yang sudah dikongsi akan terputus." }, { status: 400 });
    }

    // A work's taxonomy determines series membership, sections and rights gates.
    // Changing it through a generic edit would leave those relations inconsistent.
    if (body.type !== undefined && body.type !== existing.type) {
      return NextResponse.json({ error: "Jenis karya ditetapkan semasa draf dibuat dan tidak boleh ditukar di sini." }, { status: 400 });
    }
    if (body.version !== undefined && body.version !== existing.version) {
      return NextResponse.json({ error: "Versi diurus oleh aliran penerbitan, bukan medan suntingan." }, { status: 400 });
    }

    // Validate status if provided.
    // status=published is reserved for the explicit publish endpoint only.
    // published → draft/review/ready is reserved for a future unpublish action (not raw PATCH).
    if (body.status) {
      const validStatuses = ["draft", "review", "ready", "published", "archived"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
      }
      if (body.status === "published" && existing.status !== "published") {
        return NextResponse.json(
          {
            error:
              'Gunakan butang Publish (POST /api/admin/works/[id]/publish) untuk menerbitkan. PATCH tidak boleh menetapkan status "published".',
          },
          { status: 400 }
        );
      }
      if (
        existing.status === "published" &&
        body.status !== "published" &&
        body.status !== "archived"
      ) {
        return NextResponse.json(
          {
            error:
              'Work yang sudah terbit hanya boleh diarkib melalui PATCH (unpublish eksplisit belum disokong).',
          },
          { status: 400 }
        );
      }
    }

    // The editor's note is free text shown at the end of the work.
    let editorNote: string | undefined;
    if (body.editorNote !== undefined) {
      editorNote = String(body.editorNote ?? "");
      if (editorNote.length > 5000) {
        return NextResponse.json({ error: "Catatan editor terlalu panjang (maksimum 5000 aksara)." }, { status: 400 });
      }
    }

    // The note in the reader's "Tentang karya" card.
    let readerNote: string | undefined;
    if (body.readerNote !== undefined) {
      readerNote = String(body.readerNote ?? "");
      if (readerNote.length > 600) {
        return NextResponse.json({ error: "Nota pada kad 'Tentang karya' terlalu panjang (maksimum 600 aksara)." }, { status: 400 });
      }
    }

    const work = await updateWork(id, {
      title: body.title,
      slug: body.slug,
      status: body.status,
      body: body.body,
      genre: body.genre,
      audience: body.audience,
      dek: body.dek,
      readingMinutes: body.readingMinutes,
      // publishedAt is only meaningful alongside published status; ignore raw sets.
      publishedAt:
        body.status === "published" ? body.publishedAt : undefined,
      editorNote,
      readerNote,
      origin: body.origin === undefined ? undefined : body.origin === "sumber" ? "sumber" : "asli",
    });

    return NextResponse.json(work);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Permanently deletes a work that was never published; anything that has been public can only be archived. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    const { id } = await params;
    await deleteUnpublishedWork(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui") ? 404 : message.includes("pernah diterbitkan") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
