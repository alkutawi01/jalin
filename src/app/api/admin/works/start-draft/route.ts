import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getDb } from "../../../../../lib/db";

const types = new Set(["cerpen", "novela", "bersiri", "fragmen", "sinopsis"]);

export async function POST(request: NextRequest) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  if (!types.has(input.type)) return NextResponse.json({ error: "Jenis karya tidak sah." }, { status: 400 });
  if (input.type === "bersiri" && !input.seriesId && !String(input.newSeriesTitle ?? "").trim()) {
    return NextResponse.json({ error: "Pilih siri sedia ada atau beri tajuk siri baharu." }, { status: 400 });
  }

  try {
    const result = await getDb().transaction().execute(async (tx) => {
      const now = new Date().toISOString();
      const id = `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const slug = `draf-${id.slice(5)}`;
      let seriesId: string | null = null;
      if (input.type === "bersiri") {
        if (input.seriesId) {
          const series = await tx.selectFrom("series").select("id").where("id", "=", String(input.seriesId)).executeTakeFirst();
          if (!series) throw new Error("Siri pilihan tidak ditemui.");
          seriesId = series.id;
        } else {
          const title = String(input.newSeriesTitle).trim();
          const seriesSlug = title.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `siri-${Date.now()}`;
          const existing = await tx.selectFrom("series").select("id").where("slug", "=", seriesSlug).executeTakeFirst();
          if (existing) throw new Error("Siri dengan tajuk ini sudah wujud. Pilih siri sedia ada atau gunakan tajuk berbeza.");
          seriesId = `SER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await tx.insertInto("series").values({ id: seriesId, slug: seriesSlug, title, dek: null, genre: null, audience: "13-17", mode: "continuous", status: "ongoing", created_at: now, updated_at: now }).execute();
        }
      }
      await tx.insertInto("works").values({
        id, slug, title: "Draf tanpa tajuk", type: input.type, status: "draft", body: "", genre: null,
        audience: "13-17", dek: null, reading_minutes: null, version: "v1.0", version_label: null,
        revision_count: 0, editorial_history: JSON.stringify([{ version: "v1.0", type: "initial", summary: "Draf awal", date: now }]),
        published_at: null, published_by: null, first_published_at: null, published_revision_id: null,
        created_at: now, updated_at: now,
      }).execute();
      if (seriesId) {
        const last = await tx.selectFrom("series_entries").select("position").where("series_id", "=", seriesId).orderBy("position", "desc").executeTakeFirst();
        await tx.insertInto("series_entries").values({ series_id: seriesId, work_id: id, position: (last?.position ?? 0) + 1, created_at: now, updated_at: now }).execute();
      }
      return { id, seriesId };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draf gagal dibuat." }, { status: 409 });
  }
}
