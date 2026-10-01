import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { composeAiPrompt, type SeriesContext } from "../../../../../lib/admin/authoring/compose-prompt";
import { loadPrompts } from "../../../../../lib/admin/authoring/prompt-store";
import { isRecipeKey } from "../../../../../lib/admin/authoring/recipes";
import { loadSeriesContext } from "../../../../../lib/admin/authoring/series-context";

/**
 * POST /api/admin/authoring/prompt
 * Body: { recipe, series?: "baharu" | <seriesId>, special? }
 * Returns the text "Salin Arahan AI" copies. The editor never sees it.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { recipe?: unknown; series?: unknown; special?: unknown };
  if (typeof body.recipe !== "string" || !isRecipeKey(body.recipe)) {
    return NextResponse.json({ error: "Resipi tidak dikenali." }, { status: 400 });
  }

  let series: SeriesContext | null = null;
  if (body.series === "baharu") {
    series = { kind: "baharu" };
  } else if (typeof body.series === "string" && body.series) {
    series = await loadSeriesContext(body.series);
    if (!series) return NextResponse.json({ error: "Siri tidak ditemui." }, { status: 404 });
  }

  const stored = await loadPrompts(body.recipe);
  const prompt = composeAiPrompt({
    recipe: body.recipe,
    globalRules: stored.globalRules,
    recipeText: stored.recipeText,
    series,
    specialInstruction: typeof body.special === "string" ? body.special.slice(0, 2000) : null
  });
  return NextResponse.json({ prompt });
}
