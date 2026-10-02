import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { resetPrompt, saveGlobalRules, saveRecipeText } from "../../../../../lib/admin/authoring/prompt-store";
import { isRecipeKey } from "../../../../../lib/admin/authoring/recipes";

/**
 * POST /api/admin/authoring/settings
 * Body: { target: "global" | <recipeKey>, text?: string, reset?: boolean }
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { target?: unknown; text?: unknown; reset?: unknown };
  const target = body.target;
  if (target !== "global" && !(typeof target === "string" && isRecipeKey(target))) {
    return NextResponse.json({ error: "Sasaran tidak dikenali." }, { status: 400 });
  }

  try {
    if (body.reset === true) {
      await resetPrompt(target as "global");
      return NextResponse.json({ ok: true });
    }
    const text = typeof body.text === "string" ? body.text : "";
    if (text.trim().length < 20 || text.length > 20000) {
      return NextResponse.json({ error: "Teks arahan terlalu pendek atau terlalu panjang." }, { status: 400 });
    }
    if (target === "global") await saveGlobalRules(text);
    else await saveRecipeText(target as never, text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat." }, { status: 500 });
  }
}
