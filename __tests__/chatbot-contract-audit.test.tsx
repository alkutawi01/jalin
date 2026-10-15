import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";
import { renderItalics } from "../src/lib/reader/inline-italics";
import { danglingEmphasisParagraphs } from "../src/lib/reader/literal-emphasis";
import { buildWorkFillPrompt, parseWorkFill, FILL_SECTIONS, type WorkFillScope } from "../src/lib/admin/authoring/work-fill";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";
import { composeAiPrompt } from "../src/lib/admin/authoring/compose-prompt";
import { RECIPE_KEYS, getRecipe } from "../src/lib/admin/authoring/recipes";
import { sectionsFor } from "../src/lib/admin/authoring/output-format";
import { exampleBlock } from "../src/lib/admin/authoring/format-guidance";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";
import { assistantManuscript } from "../src/lib/admin/authoring/assistant-manuscript";

// Executable prompt -> plausible response -> parser contract for every creation recipe.
for (const key of RECIPE_KEYS) {
  const recipe = getRecipe(key);
  const wanted = sectionsFor(recipe, { newSeries: true });
  const prompt = composeAiPrompt({ recipe: key, series: key === "bersiri.data" ? { kind: "baharu" } : undefined });
  for (const section of wanted) assert(prompt.includes(`[${section}]`), `${key} requests ${section}`);
  const answer = exampleBlock(recipe, wanted).replace(/^.*\n/, "");
  const parsed = parseLabelledAnswer(answer);
  assert(parsed);
  assert.deepEqual([...parsed.sectionsFound].sort(), [...wanted].sort(), key);
  const escaped = answer.replace(/\[([A-Z]+)\]/g, "**\\[$1\\]**");
  assert.deepEqual(parseLabelledAnswer(escaped)?.sectionsFound, parsed.sectionsFound, `${key} accepts copied escaped headings`);
  console.log(`${key}: prompt/response contract passed`);
}

const answer = `[MAKLUMAT]\nDek: Satu ringkasan.\nGenre: Keluarga\n[WATAK]\nNama: Aminah\nPeranan: Ibu\n[LATAR]\nJenis: tempat\nNama: Melaka\nKeterangan: Bandar keluarga\n[GLOSARI]\nIstilah: kelindan\nMaksud: hubungan yang erat\n[SUMBER]\nTajuk asal: Buku Asal\nPengarang asal: Pengarang\n[GAMBAR]\nIstilah: rosak\nMaksud: JANGAN IMPORT\n[KREDIT]\nNama: Penulis palsu\nPeranan: Penulis`;
const legacyStored = "TUGAS\nSinopsis sepanjang 2000 hingga 5000 perkataan.\nFORMAT JAWAPAN (WAJIB DIIKUTI TEPAT)\n[FORMAT LAMA]\nCONTOH FORMAT\nTajuk: Fakta contoh lama\nBAHAN\nBahan lama";
const composed = composeAiPrompt({ recipe: "sinopsis.tulis", recipeText: legacyStored });
assert.equal((composed.match(/^FORMAT JAWAPAN/gm) ?? []).length, 1, "stored full prompt does not duplicate the schema");
assert(composed.includes("2000 hingga 5000"), "editorial customisation is retained");
assert(!composed.includes("Fakta contoh lama") && !composed.includes("FORMAT LAMA"), "old examples and format are not sent again");
for (const scope of Object.keys(FILL_SECTIONS) as WorkFillScope[]) {
  const parsed = parseWorkFill(answer, scope);
  assert.deepEqual(parsed.sections, FILL_SECTIONS[scope]);
  if (scope !== "all" && scope !== "metadata") assert.equal(parsed.dek, "");
  if (scope !== "all" && scope !== "characters") assert.equal(parsed.characters.length, 0);
  if (scope !== "all" && scope !== "source") assert.equal(parsed.source, null);
  assert(!parsed.characters.some(c => c.name === "Penulis palsu"));
  const prompt = buildWorkFillPrompt({ type: "sinopsis", body: "Aminah menemui kelindan di Melaka.", characterNames: [], glossaryTerms: [], chapterSlugs: [], scope });
  if (scope !== "all") {
    for (const excluded of FILL_SECTIONS.all.filter(s => !FILL_SECTIONS[scope].includes(s))) assert(!prompt.includes(`[${excluded}]`), `${scope} excludes ${excluded}`);
  }
}
const flat = parseWorkFill("[WATAK] Nama: Nicholas Winton Peranan: Penggerak penyelamatan Nama: Martin Blake Peranan: Rakan Nicholas [LATAR] Jenis: tempat Nama: Prague Keterangan: Bandar pendaftaran Jenis: masa Nama: 1939 Keterangan: Tahun pemindahan", "characters");
assert.deepEqual(flat.sections, ["WATAK", "LATAR"]);
assert.equal(flat.characters.length, 2);
assert.equal(flat.places[0]?.name, "Prague");
assert.equal(flat.times[0]?.name, "1939");
const wrapped = parseWorkFill("<escape>[WATAK]</escape>\nNama: Nicholas Winton\nPeranan: Penyelaras pemindahan\n<escape>[LATAR]</escape>\nJenis: tempat\nNama: Prague\nKeterangan: Pusat pendaftaran", "characters");
assert.deepEqual(wrapped.sections, ["WATAK", "LATAR"], "chat display wrapper headings are recognised");
assert.equal(wrapped.characters[0]?.name, "Nicholas Winton");
assert.equal(wrapped.places[0]?.name, "Prague");
const glossary = parseGlossaryPaste(answer, "kelindan rosak", []);
assert.equal(glossary.items.length, 1);
assert.equal(glossary.items[0]?.meaning, "hubungan yang erat");
assert.equal(parseGlossaryPaste("[WATAK]\nNama: Aminah\nPeranan: Ibu", "Aminah", []).items.length, 0);
assert.equal(parseWorkFill("[GLOSARI]\nIstilah: kelindan\nMaksud: erat\n[HAK]\nNama: Palsu").source, null);
const closing = parseLabelledAnswer("[KARYA]\nJenis: cerpen\nTajuk: Asli\n[/KARYA]\n[KREDIT]\nNama: Palsu\n[GLOSARI]\nIstilah: kelindan\nMaksud: erat");
assert.equal(closing?.raw.title, "Asli");
const communication = parseLabelledAnswer("[KARYA]\nJenis: sinopsis\nTajuk: Asli\n[KANDUNGAN]\nTeks awal.\n[MESEJ]\nAminah: Hai.\n[/MESEJ]\nTeks akhir.");
assert(String(communication?.raw.content).includes("Teks akhir."));

const render = (text: string) => renderToStaticMarkup(<StoryMarkdown glossary={{}}>{text}</StoryMarkdown>);
assert(!render('Dia menyebut *contoh".').includes("*contoh"));
assert(render("Perkataan *bonjour* dan **tebal**.").includes("<em>bonjour</em>"));
assert(render("Perkataan *bonjour* dan **tebal**.").includes("<strong>tebal</strong>"));
assert(render("2*3 = 6").includes("2*3 = 6"));
assert(render("\\*contoh").includes("*contoh"), "an explicitly escaped literal star is preserved");
assert(render("`*contoh`").includes("<code>*contoh</code>"), "literal code is preserved");
assert.equal(parseWorkFill("[MAKLUMAT KARYA]\nDek: Baris pertama\nbaris kedua.\nGenre: Keluarga", "metadata").dek, "Baris pertama baris kedua.");
assert(!renderToStaticMarkup(<>{renderItalics("**Tebal** dan *bonjour*")}</>).includes("*"));
assert.equal(danglingEmphasisParagraphs('Dia menyebut *contoh".'), 1);
assert.equal(danglingEmphasisParagraphs("*bonjour*\n\n2*3 = 6\n\n\\*contoh"), 0);
const chapters = [{ slug: "dua", title: "Dua", position: 2, body: "Kelindan." }, { slug: "satu", title: "Satu", position: 1, body: "Awal." }];
const manuscript = assistantManuscript("novela", "", chapters);
assert(manuscript.indexOf("Awal.") < manuscript.indexOf("Kelindan."));
assert.equal(chapters[0]?.slug, "dua", "chapter array is not reordered in place");
assert.equal(assistantManuscript("novela", "Manuskrip utama.", chapters), "Manuskrip utama.");
console.log("Scoped imports, section boundaries, glossary isolation and public emphasis: passed");
