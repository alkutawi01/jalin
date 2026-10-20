import { NextRequest, NextResponse } from "next/server";
import { sql } from "kysely";
import { generateWorkId } from "../../../../../lib/admin/work-id";
import type { WorkType } from "../../../../../lib/db/types";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getDb } from "../../../../../lib/db";
import { DEFAULT_AUDIENCE } from "../../../../../lib/audience";
import { draftDefaults } from "../../../../../lib/admin/series-inheritance";
import { publicErrorMessage } from "../../../../../lib/admin/api-errors";

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
      // The same readable number every other work has (JLN-CER-0012), not a timestamp. Two people starting a draft of one kind at the
      // same moment must not be given the same number, so the numbering of that kind is held for the length of this transaction.
      await sql`SELECT pg_advisory_xact_lock(hashtext(${"work-id:" + input.type}))`.execute(tx);
      const id = await generateWorkId(tx, input.type as WorkType);
      const slug = `draf-${id.toLowerCase()}`;
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
          await tx.insertInto("series").values({ id: seriesId, slug: seriesSlug, title, dek: null, genre: null, audience: DEFAULT_AUDIENCE, mode: "continuous", status: "ongoing", created_at: now, updated_at: now }).execute();
        }
      }
      // An episode starts empty. What belongs to the series (genre, audience, credits, characters, places) is offered in the editor,
      // which the editor accepts or declines; nothing is copied behind their back.
      const defaults = draftDefaults(null);
      await tx.insertInto("works").values({
        id, slug, title: "Draf tanpa tajuk", type: input.type, status: "draft", body: "", genre: defaults.genre,
        audience: defaults.audience, dek: null, reading_minutes: null, version: "v1.0", version_label: null,
        revision_count: 0, editorial_history: JSON.stringify([{ version: "v1.0", type: "initial", summary: "Draf awal", date: now }]),
        metadata: defaults.metadata ? JSON.stringify(defaults.metadata) : null,
        published_at: null, published_by: null, first_published_at: null, published_revision_id: null,
        created_at: now, updated_at: now,
      }).execute();
      if (seriesId) {
        const last = await tx.selectFrom("series_entries").select("position").where("series_id", "=", seriesId).orderBy("position", "desc").executeTakeFirst();
        await tx.insertInto("series_entries").values({ series_id: seriesId, work_id: id, position: (last?.position ?? 0) + 1, created_at: now, updated_at: now }).execute();
      }
      return { id, seriesId, inherited: null };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "Draf gagal dibuat.") }, { status: 409 });
  }
}
