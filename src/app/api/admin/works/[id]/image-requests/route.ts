import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../lib/db";
import { composeVisualPrompt } from "../../../../../../lib/admin/visual-generation/prompt-composer";

type ComposeInput = Parameters<typeof composeVisualPrompt>[0];

/**
 * GET /api/admin/works/[id]/image-requests
 * Every image request of a work with its full, ready-to-paste prompt
 * (house style + work context + scene), for the per-work image panel.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });

  const { id } = await params;
  const db = getDb();
  const work = await db.selectFrom("works").where("id", "=", id).select(["title", "type"]).executeTakeFirst();
  if (!work) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });

  const rows = await db
    .selectFrom("visual_requests")
    .where("work_id", "=", id)
    .orderBy("id", "asc")
    .select([
      "id",
      "visual_role",
      "prompt",
      "aspect_ratio",
      "alt_text",
      "anchor",
      "place",
      "status",
      "source_asset_path",
      "source_asset_url",
      "provider"
    ])
    .execute();

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      role: r.visual_role,
      aspectRatio: r.aspect_ratio,
      altText: r.alt_text,
      anchorStart: r.anchor ? r.anchor.slice(0, 80) : null,
      place: r.place,
      status: r.status,
      provider: r.provider,
      image: r.source_asset_path || r.source_asset_url || null,
      finalPrompt: composeVisualPrompt({
        sceneInstruction: r.prompt,
        role: r.visual_role as ComposeInput["role"],
        aspectRatio: (r.aspect_ratio || "3:2") as ComposeInput["aspectRatio"],
        workTitle: work.title,
        workType: work.type
      }).finalPrompt
    }))
  );
}
