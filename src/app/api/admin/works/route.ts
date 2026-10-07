import { NextRequest, NextResponse } from "next/server";
import { listWorks, listWorksByIds, createWork } from "../../../../lib/admin/work-service";
import { listUnattachedEpisodes } from "../../../../lib/admin/series-service";

/** GET /api/admin/works; ?tanpaSiri=1 for the Bersiri episodes that belong to no series yet; ?ids=a,b,c for just those works. */
export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get("ids");
    const works = ids !== null
      ? await listWorksByIds(ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 500))
      : request.nextUrl.searchParams.get("tanpaSiri") ? await listUnattachedEpisodes() : await listWorks();
    return NextResponse.json(works);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Tajuk diperlukan." }, { status: 400 });
    }
    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "Alamat pautan diperlukan." }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: "Jenis diperlukan." }, { status: 400 });
    }

    const validTypes = ["cerpen", "novela", "bersiri", "terjemahan", "fragmen", "sinopsis"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: "Jenis tidak sah." }, { status: 400 });
    }

    const validStatuses = ["draft", "review", "ready"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
    }

    const work = await createWork({
      title: body.title.trim(),
      slug: body.slug.trim(),
      type: body.type,
      status: body.status || "draft",
      body: body.body || "",
      genre: body.genre || undefined,
      audience: body.audience || undefined,
      dek: body.dek || undefined,
      readingMinutes: body.readingMinutes || undefined,
      version: body.version || "v1.0",
    });

    return NextResponse.json(work, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") || message.includes("sudah digunakan") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
