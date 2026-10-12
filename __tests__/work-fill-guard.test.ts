/**
 * The chatbot only suggests. A suggestion is used only if the chatbot proved it read the whole text (it quotes the last words), and only
 * what the text supports: no invented characters, no guessed era. Also: a heading with its content on the same line is read.
 */
import { dekWarning } from "../src/lib/admin/authoring/dek-rule";
import { buildWorkFillPrompt, guardWorkFill, manuscriptTail, parseWorkFill, sawWholeManuscript } from "../src/lib/admin/authoring/work-fill";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const body = "Izhar membawa mushaf ke rumah Ustazah Hazarah. Jannah menunggu di beranda. " + "kata ".repeat(70) + "Mereka belajar sehingga petang dan pulang dengan senyap sebelum maghrib.";
const base = { type: "bersiri", body, glossaryTerms: [], characterNames: [], chapterSlugs: [] };

const prompt = buildWorkFillPrompt(base);
assert(prompt.includes("=== MULA MANUSKRIP ===") && prompt.includes("=== TAMAT MANUSKRIP ==="), "the manuscript is framed with start and end markers");
assert(prompt.includes(`(${body.split(/\s+/).length} perkataan`), "the word count is stated");
assert(prompt.includes("[SEMAKAN]") && prompt.includes("TEKS TIDAK LENGKAP"), "the prompt asks for the quoted ending and a refusal when the text is cut off");
assert(prompt.includes("MESTI wujud dalam manuskrip"), "names must exist in the manuscript");
assert(manuscriptTail(body) === "dengan senyap sebelum maghrib." || manuscriptTail(body).endsWith("sebelum maghrib."), "the tail is the last words");

const good = parseWorkFill(`[MAKLUMAT]
Dek: Satu petang di beranda.
Genre: Drama

[WATAK]
Nama: Izhar
Peranan: Pelajar
____
Nama: Faris
Peranan: Anak saudara

[LATAR]
Jenis: masa
Nama: Era SPM
Keterangan: Zaman persekolahan

[SEMAKAN]
Perkataan terakhir: dengan senyap sebelum maghrib.`);
assert(sawWholeManuscript(good, body), "a correct quoted ending proves the whole text was read");
const guarded = guardWorkFill(good, body);
assert(guarded.result.characters.map((c) => c.name).join() === "Izhar", "a character not written in the text is dropped");
assert(guarded.result.times.length === 0 && guarded.notes.some((n) => n.includes("Era SPM")), "a time the text does not support is dropped and said");
assert(!good.sections.includes("SEMAKAN"), "the check section is not a fill section");

const cut = parseWorkFill("[MAKLUMAT]\nDek: x\n[SEMAKAN]\nPerkataan terakhir: Jannah menunggu di beranda.");
assert(!sawWholeManuscript(cut, body), "an ending taken from the middle of the text is refused");
const none = parseWorkFill("[MAKLUMAT]\nDek: x\nGenre: y");
assert(!sawWholeManuscript(none, body), "an answer without the check is refused");
const incomplete = parseWorkFill("TEKS TIDAK LENGKAP");
assert(incomplete.check.incomplete && incomplete.sections.length === 0, "'TEKS TIDAK LENGKAP' is recognised");

const oneLine = parseWorkFill("[MAKLUMAT] Dek: Satu petang. Genre: Drama [WATAK] Nama: Izhar Peranan: Pelajar [SEMAKAN] Perkataan terakhir: sebelum maghrib.");
assert(oneLine.dek === "Satu petang." && oneLine.genre === "Drama", "dek and genre are read when the heading and fields share one line");
assert(oneLine.characters.length === 1 && oneLine.characters[0]!.name === "Izhar", "a character is read from one line");
assert(sawWholeManuscript(oneLine, body), "the check is read from one line");

const year = guardWorkFill(parseWorkFill("[LATAR]\nJenis: masa\nNama: 1969\nKeterangan: Selepas rusuhan"), "Pada tahun 1969 mereka tiba.");
assert(year.result.times.length === 1, "a year that is written in the text is kept");

// --- a chatbot that lost the format -------------------------------------------------------------------------------------
const noHeadings = parseWorkFill(`Dek: Satu petang di beranda.
Genre: Drama
Nama: Izhar
Peranan: Pelajar
Jenis: tempat
Nama: Beranda
Keterangan: Tempat mereka duduk
Istilah: mushaf
Maksud: Naskhah al-Quran.`);
assert(noHeadings.dek === "Satu petang di beranda." && noHeadings.genre === "Drama", "no headings at all: dek and genre are inferred from their labels");
assert(noHeadings.characters.length === 1 && noHeadings.characters[0]!.name === "Izhar", "no headings: a character is inferred");
assert(noHeadings.places.length === 1 && noHeadings.places[0]!.name === "Beranda", "no headings: a Nama after Jenis belongs to the place, not to a character");
assert(noHeadings.glossaryText.includes("mushaf"), "no headings: the glossary is inferred");

const longBody = "Izhar menyelesaikan latihan. Abah memandang meja. " + "kata ".repeat(70) + "Soalan yang ditinggalkannya pula tidak boleh diselesaikan dengan mengulang mana-mana halaman.";
const near = parseWorkFill("[MAKLUMAT]\nDek: x\n[SEMAKAN]\nPerkataan terakhir: diselesaikan dengan mengulang mana-mana halaman");
assert(sawWholeManuscript(near, longBody), "an ending quoted with fewer words and no full stop is accepted");
const wrong = parseWorkFill("[MAKLUMAT]\nDek: x\n[SEMAKAN]\nPerkataan terakhir: Abah memandang");
assert(!sawWholeManuscript(wrong, longBody), "words from earlier in the text are not the ending");
const echoed = parseWorkFill("[WATAK]\nWatak yang SUDAH ada (jangan ulang): Jannah, Izhar.\nNama: Faris\nPeranan: Anak saudara\n\n[LATAR]\nTempat yang SUDAH ada (jangan ulang): Rumah.\nJenis: tempat\nNama: Bilik guru\nKeterangan: Ruang guru");
assert(echoed.characters.length === 1 && echoed.places.length === 1, "repeated 'already have' lines are not read as entries");

assert(prompt.includes("BURUK (merumuskan") && prompt.includes("BAIK (tiga bentuk"), "the prompt gives a bad and a good dek example");
assert(dekWarning("Izhar menyusun semula jadual selepas mendapat teguran daripada ustaz. Dia kemudian memutuskan untuk berubah. Akhirnya dia berjaya.") !== null, "a summarising dek gets a warning");
assert(dekWarning("Hujan belum reda, dan ada satu nama yang tidak pernah disebut sesiapa di rumah itu.") === null, "a hook dek gets none");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
