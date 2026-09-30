import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { listAiPersonas, listContributorOptions, saveAiPersona, findOrCreatePersona } from "../../../../lib/admin/ai-personas";

/** GET: every AI with its pseudonym (if set), plus the contributors that can be chosen. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [personas, contributors] = await Promise.all([listAiPersonas(), listContributorOptions()]);
  return NextResponse.json({ personas, contributors });
}

/** POST { ai, name }: set the pseudonym for an AI by typing it (empty clears it). A matching contributor is reused or created. */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { ai?: unknown; name?: unknown };
  if (typeof body.ai !== "string" || !body.ai.trim()) {
    return NextResponse.json({ error: "Nama AI diperlukan." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  try {
    const slug = name ? await findOrCreatePersona(name) : null;
    await saveAiPersona(body.ai, slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat." }, { status: 500 });
  }
}
