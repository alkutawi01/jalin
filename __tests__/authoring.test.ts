import { composeAiPrompt } from "../src/lib/admin/authoring/compose-prompt";
import { parseLabelledAnswer, looksLabelled } from "../src/lib/admin/authoring/labelled-output";
import { RECIPE_KEYS, getRecipe, recipeFor } from "../src/lib/admin/authoring/recipes";
import { buildImportPlan } from "../src/lib/admin/import/plan";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

const CERPEN = `Berikut maklumat karya:

**[KARYA]**
- Jenis: cerpen
- Tajuk: Lampu di Hujung Lorong
- Slug: lampu-di-hujung-lorong
- Dek: Seorang budak menunggu lampu jalan menyala.
- Genre: Realisme
- Penulis: tidak dinyatakan
- Anggaran bacaan: 3 minit

[GLOSARI]
Istilah: lorong
Maksud: jalan sempit di antara bangunan
____
Istilah: zorbak
Maksud: perkataan yang tiada dalam teks

[GAMBAR]
Jenis: hero
Nisbah: 16:9
Adegan: A narrow alley at dusk, a single street lamp flickering.
Muka: no people in frame
Alt: Lorong sempit pada senja.
Sebab: Suasana awal.
[/GAMBAR]`;

const TEXT = "Aina berdiri di lorong yang sunyi.\n\nLampu jalan berkelip-kelip pada senja itu.";

console.log("authoring");
assert(looksLabelled(CERPEN), "labelled answer is recognised despite bold and preamble");
const parsed = parseLabelledAnswer(CERPEN);
assert(parsed !== null && parsed.sectionsFound.includes("GLOSARI"), "sections found");

const result = buildImportPlan(CERPEN, TEXT, { mode: "data", writerName: "Nur Aina" });
assert(result.ok && result.plan !== null, "labelled cerpen builds a plan");
const plan = result.plan!;
assert(plan.work.title === "Lampu di Hujung Lorong" && plan.work.type === "cerpen", "title and type read");
assert(plan.glossary.length === 1 && plan.glossary[0]!.term === "lorong", "glossary drops terms absent from the text");
assert(plan.visuals.length === 1 && plan.visuals[0]!.role === "hero", "one hero visual");
assert(plan.credits.some((c) => c.roleLabel === "initial_draft" && c.byline && c.guestName === "Nur Aina"), "writer credited with byline");

const overridden = buildImportPlan(CERPEN, TEXT, { overrides: { title: "Tajuk Lain" }, writerName: "X" });
assert(overridden.plan?.work.slug === "tajuk-lain", "changing the title re-derives the slug");

const tulis = buildImportPlan(CERPEN + "\n\n[KANDUNGAN]\nSatu dua tiga empat.\n[/KANDUNGAN]", "", { mode: "tulis", writerName: "X" });
assert(tulis.ok && tulis.plan!.work.body.includes("Satu dua"), "tulis mode takes the body from [KANDUNGAN]");
const tulisMissing = buildImportPlan(CERPEN, "", { mode: "tulis" });
assert(!tulisMissing.ok && tulisMissing.errors.some((e) => e.code === "content_missing"), "tulis mode without [KANDUNGAN] fails clearly");

const bersiri = buildImportPlan(CERPEN.replace("Jenis: cerpen", "Jenis: bersiri"), TEXT, { series: { kind: "baharu", title: "Siri Lorong" } });
assert(bersiri.ok && bersiri.plan!.series?.kind === "baharu", "bersiri needs a series choice and builds with one");
const noSeries = buildImportPlan(CERPEN.replace("Jenis: cerpen", "Jenis: bersiri"), TEXT, {});
assert(!noSeries.ok && noSeries.errors.some((e) => e.code === "series_choice_missing"), "bersiri without a series choice is rejected");

assert(RECIPE_KEYS.length === 7, "seven recipes");
assert(recipeFor("cerpen", "data") !== undefined && getRecipe("sinopsis.tulis").mode === "tulis", "recipes resolve");
for (const key of RECIPE_KEYS) {
  const prompt = composeAiPrompt({ recipe: key });
  assert(prompt.includes("[KARYA]") && prompt.includes("PERATURAN GAMBAR"), `${key}: prompt has format and image rules`);
}
const cont = composeAiPrompt({
  recipe: "bersiri.data",
  series: { kind: "sambung", title: "Siri Lorong", mode: "continuous", previousEpisodes: ["A", "B"] },
  specialInstruction: "Fokus pada watak Aina."
});
assert(cont.includes("episod ke-3") && cont.includes("Fokus pada watak Aina.") && !cont.includes("[SIRI]\n"), "series context and special instruction are layered");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
