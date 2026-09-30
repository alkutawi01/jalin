import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWork, archiveWork } from "../../../../../lib/admin/work-service";
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

    if (typeof body.body === "string" && hasDb()) {
      const markers = imageMarkers(body.body);
      for (const marker of markers) {
        if (body.body.split(marker).length !== 2) {
          return NextResponse.json({ error: `Penanda ${marker} berulang. Setiap penanda gambar mesti unik.` }, { status: 400 });
        }
      }
      const attached = await getDb().selectFrom("visuals").where("work_id", "=", id).select("anchor").execute();
      for (const visual of attached) {
        if (isImageMarker(visual.anchor) && !markers.includes(visual.anchor!)) {
          return NextResponse.json({ error: `Penanda ${visual.anchor} masih digunakan oleh gambar. Alihkannya, jangan padam; atau padam gambar itu dahulu.` }, { status: 400 });
        }
      }
    }

    // Validate type if provided
    if (body.type) {
      const validTypes = ["cerpen", "novela", "bersiri", "terjemahan", "fragmen", "sinopsis"];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json({ error: "Jenis tidak sah." }, { status: 400 });
      }
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

    // Editor Pick: live homepage curation controls.
    let editorPick: boolean | undefined;
    if (body.editorPick !== undefined) {
      if (typeof body.editorPick !== "boolean") {
        return NextResponse.json({ error: "Pilihan Editor tidak sah." }, { status: 400 });
      }
      editorPick = body.editorPick;
    }

    let editorPickRank: number | null | undefined;
    if (body.editorPickRank !== undefined) {
      if (body.editorPickRank === null || body.editorPickRank === "") {
        editorPickRank = null;
      } else {
        const rank = Number(body.editorPickRank);
        if (!Number.isInteger(rank) || rank < 1 || rank > 99) {
          return NextResponse.json(
            { error: "Kedudukan Pilihan Editor mesti antara 1 dan 99." },
            { status: 400 }
          );
        }
        editorPickRank = rank;
      }
    }

    let editorPickReason: string | null | undefined;
    if (body.editorPickReason !== undefined) {
      const reason = String(body.editorPickReason ?? "").trim();
      if (reason.length > 300) {
        return NextResponse.json(
          { error: "Sebab Pilihan Editor maksimum 300 aksara." },
          { status: 400 }
        );
      }
      editorPickReason = reason || null;
    }

    const work = await updateWork(id, {
      title: body.title,
      slug: body.slug,
      type: body.type,
      status: body.status,
      body: body.body,
      genre: body.genre,
      audience: body.audience,
      dek: body.dek,
      readingMinutes: body.readingMinutes,
      version: body.version,
      // publishedAt is only meaningful alongside published status; ignore raw sets.
      publishedAt:
        body.status === "published" ? body.publishedAt : undefined,
      editorPick,
      editorPickRank,
      editorPickReason,
    });

    return NextResponse.json(work);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
