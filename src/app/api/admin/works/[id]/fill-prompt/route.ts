import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../lib/db";
import { composeAiPrompt } from "../../../../../../lib/admin/authoring/compose-prompt";
import { loadPrompts } from "../../../../../../lib/admin/authoring/prompt-store";
import { isRecipeKey } from "../../../../../../lib/admin/authoring/recipes";

/**
 * POST /api/admin/works/[id]/fill-prompt
 * One prompt for the whole work: Jalin's rules and answer format, the work's text, and what it already has.
 * The answer is applied with POST .../apply-answer. The text of the work itself is never part of the answer.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });

  const { id } = await params;
  const db = getDb();
  const work = await db.selectFrom("works").where("id", "=", id).selectAll().executeTakeFirst();
  if (!work) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
  const recipe = `${work.type}.data`;
  if (!isRecipeKey(recipe)) return NextResponse.json({ error: "Jenis karya ini belum disokong." }, { status: 400 });

  const sections = await db.selectFrom("reading_sections").where("work_id", "=", id).selectAll().orderBy("position", "asc").execute();
  const text = sections.length > 0
    ? sections.map((s) => `## ${s.title || s.slug}\n(slug bab: ${s.slug})\n\n${s.body}`).join("\n\n")
    : String(work.body ?? "").trim();
  if (!text.trim()) return NextResponse.json({ error: "Karya ini belum mempunyai teks. Masukkan teks karya dahulu." }, { status: 400 });

  const glossary = await db.selectFrom("glossary_terms").where("work_id", "=", id).select("term").execute();
  const metadata = (work.metadata ?? {}) as { characters?: { name: string }[] };
  const requests = await db.selectFrom("visual_requests").where("work_id", "=", id).select(["visual_role", "status"]).execute();
  const visuals = await db.selectFrom("visuals").where("work_id", "=", id).select("role").execute();
  const hasHero = visuals.some((v) => v.role === "hero") || requests.some((r) => r.visual_role === "hero" && r.status !== "rejected");

  const already = [
    `Jenis karya: ${work.type} (tetap; jangan tukar). Tajuk: ${work.title}.`,
    work.dek ? "Dek sudah ada; anda tidak perlu mencadangkannya." : "Dek belum ada.",
    work.genre ? "Genre sudah ada." : "Genre belum ada.",
    glossary.length ? `Istilah glosari yang SUDAH ada (jangan ulang): ${glossary.map((g) => String(g.term).replace(/\*/g, "")).join(", ")}.` : "Glosari belum ada.",
    metadata.characters?.length ? `Watak yang SUDAH ada (jangan ulang): ${metadata.characters.map((c) => c.name).join(", ")}.` : "Watak belum ada.",
    hasHero ? "Gambar hero sudah ada atau sudah dipohon; JANGAN cadangkan gambar hero." : "Gambar hero belum ada; cadangkan satu.",
    requests.length + visuals.length > 0 ? "Sebahagian gambar sudah ada; cadangkan hanya gambar inline untuk adegan LAIN yang benar-benar visual." : "",
    sections.length > 0 ? "Bahagian [BAB] tidak diperlukan; struktur bab sudah wujud. Gunakan slug bab di atas untuk Muncul di dan Bab." : "",
    "Anda TIDAK perlu mengeluarkan kredit, hak, atau teks karya. Jika anda tidak tahu sesuatu maklumat (terutama sumber), biarkan kosong atau tulis: tidak dinyatakan. Jangan mereka."
  ].filter(Boolean).join("\n");

  const stored = await loadPrompts(recipe);
  const prompt = composeAiPrompt({
    recipe,
    globalRules: stored.globalRules,
    recipeText: stored.recipeText,
    omitSections: ["BAB", "KANDUNGAN", "SIRI"],
    material: `${already}\n\nTEKS KARYA\n${text}`
  });
  return NextResponse.json({ prompt });
}
