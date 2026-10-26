import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWorkTheme, workHeroSrc } from "../../../../../../lib/admin/work-service";
import { publicErrorMessage } from "../../../../../../lib/admin/api-errors";
import { dominantColorFromHero } from "../../../../../../lib/admin/hero-color";
import { derivePalettes, normaliseHex, parseThemeSetting } from "../../../../../../lib/reader/story-theme";
import { SITE_URL } from "../../../../../../lib/seo";

/**
 * The colour of one work (works.metadata.theme). GET reads it; PATCH { mode: "none" | "manual" | "auto", color? } sets it.
 * "auto" reads the colour from the work's hero picture now and keeps it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const work = await getWork(id);
    if (!work) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    const theme = parseThemeSetting(work.metadata?.theme);
    return NextResponse.json({ theme, palettes: theme ? derivePalettes(theme.color) : null });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "Ralat tidak diketahui.") }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { mode?: unknown; color?: unknown };
    if (body.mode === "none") {
      await updateWorkTheme(id, null);
      return NextResponse.json({ theme: null, palettes: null });
    }
    if (body.mode === "manual") {
      const color = normaliseHex(body.color);
      if (!color) return NextResponse.json({ error: "Warna tidak sah. Gunakan format #rrggbb." }, { status: 400 });
      await updateWorkTheme(id, { mode: "manual", color });
      return NextResponse.json({ theme: { mode: "manual", color }, palettes: derivePalettes(color) });
    }
    if (body.mode === "auto") {
      const src = await workHeroSrc(id);
      if (!src) return NextResponse.json({ error: "Karya ini belum ada gambar utama untuk dibaca warnanya." }, { status: 400 });
      const color = await dominantColorFromHero(src, SITE_URL);
      if (!color) return NextResponse.json({ error: "Warna tidak dapat dibaca daripada gambar utama. Cuba pilih warna sendiri." }, { status: 422 });
      await updateWorkTheme(id, { mode: "auto", color });
      return NextResponse.json({ theme: { mode: "auto", color }, palettes: derivePalettes(color) });
    }
    return NextResponse.json({ error: "mode mesti none, manual atau auto." }, { status: 400 });
  } catch (error) {
    const message = publicErrorMessage(error, "Ralat tidak diketahui.");
    return NextResponse.json({ error: message }, { status: message === "Karya tidak ditemui." ? 404 : 400 });
  }
}
