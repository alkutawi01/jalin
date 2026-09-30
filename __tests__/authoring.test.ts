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

// Real ChatGPT behaviours seen in testing: blank-line separators, "istilah: maksud" shorthand,
// quotes around Petikan, no title when the text has none.
const REAL = `[KARYA]
Jenis: cerpen
Tajuk: tidak dinyatakan
Slug: tidak dinyatakan
Dek: Satu premis.
Genre: keluarga

[WATAK]
Nama: Mak Limah
Peranan: Nenek

Nama: Hakim
Peranan: Cucu

[GLOSARI]
beranda: bahagian rumah di hadapan

lorong: jalan sempit

[GAMBAR]
Jenis: hero
Petikan:
Nisbah: 3:2
Adegan: A veranda in the rain.
Muka: no people in frame
Alt: Beranda.

Jenis: inline
Petikan: "Lampu jalan berkelip-kelip pada senja itu, di lorong."
Letak: selepas
Nisbah: 4:3
Adegan: A flickering street lamp at dusk.
Muka: no people in frame
Alt: Lampu jalan.`;
const realText = ["Aina berdiri di beranda.", "Lampu jalan berkelip-kelip pada senja itu, di lorong."].join("\n\n");
const noTitle = buildImportPlan(REAL, realText, {});
assert(!noTitle.ok && noTitle.errors.some((e) => e.code === "title_missing"), "no title from chatbot and none typed is an error");
const real = buildImportPlan(REAL, realText, { overrides: { title: "Beranda Senja" }, writerName: "X" });
assert(real.ok && real.plan!.work.slug === "beranda-senja", "editor's title fills a missing title and derives the slug");
assert(real.plan!.characters.length === 2, "items separated only by a blank line are all kept");
assert(real.plan!.glossary.length === 2, "glossary shorthand 'istilah: maksud' is read");
assert(real.plan!.visuals.length === 2 && real.plan!.visuals[1]!.anchor !== null, "quoted Petikan still resolves to its paragraph");

const NOVELA = [
  "[KARYA]", "Jenis: novela", "Tajuk: Dua Bab", "Slug: dua-bab", "Dek: Ujian.",
  "", "[BAB]", "Nombor: 1", "Slug: bab-1", "Tajuk: Satu", "Tajuk dalam manuskrip: BAB 1 — Satu", "",
  "Nombor: 2", "Slug: bab-2", "Tajuk: Dua", "Tajuk dalam manuskrip: BAB 2 — Dua",
  "", "[GAMBAR]", "Jenis: hero", "Bab:", "Petikan:", "Nisbah: 3:2", "Adegan: A door.", "Muka: no people in frame", "Alt: Pintu."
].join("\n");
const novelaText = "BAB 1 — Satu\n\nIsi bab satu.\n\nBAB 2 — Dua\n\nIsi bab dua.";
const nov = buildImportPlan(NOVELA, novelaText, { writerName: "X" });
assert(nov.ok && nov.plan!.sections.length === 2 && nov.plan!.visuals.length === 1, "an empty 'Bab:' label in GAMBAR is not read as a [BAB] heading");
// Review-screen edits
const edited = buildImportPlan(REAL, realText, {
  overrides: { title: "Beranda Senja" },
  writerName: "X",
  edits: {
    readingMinutes: 7,
    glossary: [{ term: "beranda", meaning: "bahagian depan rumah" }, { term: "tiada", meaning: "tiada dalam teks" }],
    characters: [{ name: "Aina", role: "Anak" }],
    visuals: [null, { altText: "Lampu di senja", place: "before", scene: "A lamp at dusk, no people." }]
  }
});
assert(edited.ok && edited.plan!.work.readingMinutes === 7, "edited reading minutes are used");
assert(edited.plan!.glossary.length === 1 && edited.plan!.glossary[0]!.meaning === "bahagian depan rumah", "edited glossary replaces the parsed one and drops terms absent from the text");
assert(edited.plan!.characters.length === 1 && edited.plan!.characters[0]!.role === "Anak", "edited characters replace the parsed ones");
assert(edited.plan!.visuals.length === 1 && edited.plan!.visuals[0]!.place === "before" && edited.plan!.visuals[0]!.originalIndex === 1, "an image can be removed and another edited");
assert(edited.plan!.visuals[0]!.finalPrompt.includes("A lamp at dusk"), "edited scene is reflected in the full image prompt");
const placed = buildImportPlan(REAL.replace("Nisbah: 4:3", ["Letak: selepas tajuk", "Nisbah: 4:3"].join("\n")), realText, { overrides: { title: "T" }, writerName: "X" });
assert(placed.plan!.visuals[1]!.place === "after", "a loose Letak label such as 'selepas tajuk' still means after");

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
