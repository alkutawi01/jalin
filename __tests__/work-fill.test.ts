/** One copy, one paste: the all-in-one prompt and the parser for the chatbot's answer. */
import { buildWorkFillPrompt, parseWorkFill } from "../src/lib/admin/authoring/work-fill";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const body = "Roslan membuka bonet dan melihat fan belt yang putus. Hujan menimpa zink bengkel.";

console.log("\n=== Prompt ===");
const cerpen = buildWorkFillPrompt({ type: "cerpen", body, glossaryTerms: ["starter"], characterNames: ["Roslan"], chapterSlugs: [] });
assert(cerpen.includes("[MAKLUMAT]") && cerpen.includes("[WATAK]") && cerpen.includes("[GLOSARI]"), "asks for information, characters and glossary");
assert(!cerpen.includes("[SUMBER]"), "a cerpen is not asked for a source");
assert(!cerpen.includes("Muncul:"), "no 'first appears' line when there are no chapters");
assert(cerpen.includes("starter") && cerpen.includes("Roslan"), "lists what already exists so it is not repeated");
assert(cerpen.includes("Asing:") && cerpen.includes("Tiada had bilangan"), "reuses the glossary rules (Asing line, no quota)");
assert(cerpen.includes(body), "carries the manuscript");
assert(/Jangan sentuh teks karya, kredit, imej atau hak/.test(cerpen), "tells the chatbot not to touch text, credits, images or rights");
assert(!/\[KREDIT\]|\[GAMBAR\]|\[HAK/.test(cerpen), "has no credits, images or rights section");
const novela = buildWorkFillPrompt({ type: "novela", body, glossaryTerms: [], characterNames: [], chapterSlugs: ["bab-1", "bab-2"] });
assert(novela.includes("Muncul:") && novela.includes("bab-1, bab-2"), "novela prompt lists chapter slugs for first appearance");
const frag = buildWorkFillPrompt({ type: "fragmen", body, glossaryTerms: [], characterNames: [], chapterSlugs: [] });
assert(frag.includes("[SUMBER]") && !/hak|bukti/i.test(frag.split("[SUMBER]")[1]!.split("MANUSKRIP")[0]!), "fragmen asks for the source but not for rights evidence");

console.log("\n=== Answer ===");
const answer = `[MAKLUMAT]
Dek: Seorang pemilik bengkel bergelut dengan wang dan kereta rosak.
Genre: Drama keluarga

[WATAK]
Nama: Roslan
Peranan: Pemilik bengkel
____
Nama: Aqil
Peranan: Anak Roslan
Muncul: bab-2

[GLOSARI]
Istilah: fan belt
Maksud: Tali getah dalam enjin.
Asing: fan belt

[SUMBER]
Tajuk asal: Tiada
Pengarang asal: perlu semakan editor`;
const r = parseWorkFill(answer);
assert(r.dek.startsWith("Seorang pemilik") && r.genre === "Drama keluarga", "reads dek and genre");
assert(r.characters.length === 2 && r.characters[1]!.name === "Aqil" && r.characters[1]!.first === "bab-2", "reads characters and first appearance");
assert(r.sections.join() === "MAKLUMAT,WATAK,GLOSARI,SUMBER", "knows which sections the answer had");
assert(r.source === null, "'Tiada' and 'perlu semakan editor' are treated as empty, so no source is invented");
const g = parseGlossaryPaste(r.glossaryText, body, []);
assert(g.items.length === 1 && g.items[0]!.term === "*fan belt*", "the glossary section goes through the glossary parser (Asing italicised)");

console.log("\n=== Partial and messy answers ===");
const p = parseWorkFill("Berikut cadangan:\n[MAKLUMAT]\n**Dek:** Satu ayat.\n[WATAK]\nTiada watak.\n");
assert(p.dek === "Satu ayat." && p.characters.length === 0 && p.genre === "", "missing parts stay empty; 'Tiada watak' gives none");
const s = parseWorkFill("[SUMBER]\nTajuk asal: Hikayat Hang Tuah\nPengarang asal: Tidak diketahui\nBahasa asal: Melayu klasik\nAsas teks: Edisi 1908");
assert(s.source !== null && s.source!.title === "Hikayat Hang Tuah" && s.source!.basis === "Edisi 1908", "reads a source section");
assert(parseWorkFill("").sections.length === 0, "an empty paste has no sections");

console.log("\n=== A real ChatGPT answer (recorded) ===");
const real = `[MAKLUMAT]
Dek: Nadia menyangka ini cuma satu lagi perjalanan ke Kuala Lumpur. Namun, di sebalik tiket yang digenggamnya, ada perubahan yang belum mampu dia namakan.
Genre: Drama remaja

[WATAK]
Nama: Nadia
Peranan: Remaja yang melakukan perjalanan dari Kajang ke Kuala Lumpur.

Nama: Puan Rohana
Peranan: Ibu Nadia yang menunggunya di Kuala Lumpur.

Nama: seorang tua
Peranan: Penumpang yang menawarkan tempat duduk kepada Nadia dalam perjalanan.

[GLOSARI]
Tiada istilah sukar.`;
const rr = parseWorkFill(real);
assert(rr.dek.startsWith("Nadia menyangka") && rr.genre === "Drama remaja", "real answer: dek and genre");
assert(rr.characters.map((c) => c.name).join() === "Nadia,Puan Rohana,seorang tua", "real answer: three characters split on blank lines");
assert(parseGlossaryPaste(rr.glossaryText, "x", []).none, "real answer: 'Tiada istilah sukar' is recognised");

console.log("\n=== Source edition ===");
const sourcedCerpen = buildWorkFillPrompt({ type: "cerpen", body, glossaryTerms: [], characterNames: [], chapterSlugs: [], origin: "sumber" });
assert(sourcedCerpen.includes("[SUMBER]"), "a cerpen marked 'daripada sumber lain' is asked for the source");
const ownCerpen = buildWorkFillPrompt({ type: "cerpen", body, glossaryTerms: [], characterNames: [], chapterSlugs: [], origin: "asli" });
assert(!ownCerpen.includes("[SUMBER]"), "an original cerpen is not");
for (const label of ["Tahun terbit pertama:", "Penerbit:", "Tahun cetakan:", "Cetakan ke:", "Penyunting:", "Penterjemah:", "ISBN:", "Lokasi petikan:"]) {
  assert(sourcedCerpen.includes(label), `asks for ${label}`);
}
assert(/TINGGALKAN/.test(sourcedCerpen) && /jangan meneka/.test(sourcedCerpen), "tells the chatbot to leave blank what it does not know");

const sourceAnswer = `[SUMBER]
Tajuk asal: Salina
Pengarang asal: A. Samad Said
Bahasa asal: Bahasa Melayu
Tahun terbit pertama: 1961
Penerbit: Dewan Bahasa dan Pustaka
Tahun cetakan: 1991
Cetakan ke: Cetakan ketiga
Penyunting:
Penterjemah: tiada
ISBN: 983-62-1234-5
Lokasi petikan: ms. 12-14
Asas teks:`;
const sr = parseWorkFill(sourceAnswer).source!;
assert(sr.firstPublished === 1961 && sr.editionYear === 1991, "first publication year and printing year are kept apart");
assert(sr.publisher === "Dewan Bahasa dan Pustaka" && sr.printing === "Cetakan ketiga" && sr.locator === "ms. 12-14", "publisher, printing and locator are read");
assert(sr.editor === "" && sr.translator === "" && sr.basis === "", "what the chatbot left blank stays blank ('tiada' too)");
assert(sr.isbn === "983-62-1234-5", "a well-formed ISBN is kept");
const badIsbn = parseWorkFill("[SUMBER]\nTajuk asal: X\nISBN: pasti ada tapi saya lupa").source!;
assert(badIsbn.isbn === "", "text that is not an ISBN is dropped");
const yearText = parseWorkFill("[SUMBER]\nTajuk asal: X\nTahun terbit pertama: sekitar 1961 (anggaran)").source!;
assert(yearText.firstPublished === 1961, "a year inside words is found");
const emptySource = parseWorkFill("[SUMBER]\nTajuk asal:\nPenerbit:");
assert(emptySource.source === null, "an all-blank source section produces nothing to fill");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
