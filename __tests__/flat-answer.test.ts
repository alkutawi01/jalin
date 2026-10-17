/** An AI answer copied with its line breaks lost (everything in one line) is still read into the right fields. */
import { restoreFlatAnswer } from "../src/lib/admin/authoring/flat-answer";
import { planEditorAnswer } from "../src/lib/admin/authoring/editor-assistant";
import { AUTHORING_LABELS } from "../src/lib/admin/authoring/response-layout";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const tidy = `[KARYA]
Tajuk: Anak-anak Kereta Api
Slug: anak-anak-kereta-api
Blurb: Kehidupan tiga beradik berubah apabila bapa mereka tiba-tiba tiada di rumah.

[KANDUNGAN]
Roberta yang dipanggil Bobbie hidup bahagia.

Keluarga itu berpindah ke Three Chimneys.

[MAKLUMAT]
Genre: Fiksyen kanak-kanak
Catatan: Sinopsis novel The Railway Children.

[WATAK]
Nama: Bobbie
Peranan: Anak sulung
____
Nama: Peter
Peranan: Adik lelaki

[SUMBER]
Tajuk asal: The Railway Children
Pengarang asal: E. Nesbit
Bahasa asal: Inggeris
Tahun terbit pertama: 1906
Penerbit: tidak dinyatakan`;

// What the editor pasted: no line breaks at all, and the opening "[KARYA] Tajuk:" gone.
const flat = "Anak-anak Kereta Api Slug: anak-anak-kereta-api Blurb: Kehidupan tiga beradik berubah apabila bapa mereka tiba-tiba tiada di rumah. "
  + "[KANDUNGAN] Roberta yang dipanggil Bobbie hidup bahagia.  Keluarga itu berpindah ke Three Chimneys.  "
  + "[MAKLUMAT] Genre: Fiksyen kanak-kanak Catatan: Sinopsis novel The Railway Children.  "
  + "[WATAK] Nama: Bobbie Peranan: Anak sulung ____ Nama: Peter Peranan: Adik lelaki "
  + "[SUMBER] Tajuk asal: The Railway Children Pengarang asal: E. Nesbit Bahasa asal: Inggeris Tahun terbit pertama: 1906 Penerbit: tidak dinyatakan";

const wrapped = `<escape>${tidy}</escape>`;
const flatWithHead = flat.replace(/^/, "[KARYA] Tajuk: ");

const state = { work: { type: "sinopsis", title: "Draf tanpa tajuk", slug: "draf-jln-sin-0006", body: "", metadata: {} }, chapters: [], credits: [], glossary: [], source: null };
const bodyOf = (changes: Array<{ id: string; after: string }>) => changes.find((change) => change.id === "content:body")?.after ?? "";
const field = (changes: Array<{ id: string; after: string }>, id: string) => changes.find((change) => change.id === id)?.after ?? "";

for (const [name, text] of [["tidy", tidy], ["wrapped in <escape>", wrapped], ["flat without the opening tag", flat], ["flat with the opening tag", flatWithHead]] as const) {
  const changes = planEditorAnswer(text, "all", state as never) as Array<{ id: string; after: string }>;
  assert(field(changes, "content:title") === "Anak-anak Kereta Api", `${name}: the title is only the title (got "${field(changes, "content:title").slice(0, 40)}")`);
  assert(field(changes, "content:slug") === "anak-anak-kereta-api", `${name}: the slug is read`);
  assert(field(changes, "content:dek").startsWith("Kehidupan tiga beradik") && !field(changes, "content:dek").includes("[KANDUNGAN]"), `${name}: the blurb stops where the content starts`);
  assert(field(changes, "metadata:genre") === "Fiksyen kanak-kanak", `${name}: the genre is only the genre (got "${field(changes, "metadata:genre").slice(0, 40)}")`);
  assert(field(changes, "metadata:editorNote").startsWith("Sinopsis novel"), `${name}: the note is its own field`);
  assert(bodyOf(changes).split("\n\n").length === 2, `${name}: the two paragraphs of the content stay two paragraphs`);
  assert(field(changes, "source:originalTitle") === "The Railway Children", `${name}: the original title is only the title (got "${field(changes, "source:originalTitle").slice(0, 50)}")`);
  assert(field(changes, "source:author") === "E. Nesbit" && field(changes, "source:originalLanguage") === "Inggeris" && field(changes, "source:publicationYear") === "1906", `${name}: author, language and year are their own fields`);
  assert(changes.some((change) => change.id === "characters:characters/Peter"), `${name}: the characters after the content are read`);
}

assert(restoreFlatAnswer(tidy, AUTHORING_LABELS) === tidy, "an answer that already has its lines is returned as it came");
assert(restoreFlatAnswer("Tajuk: Satu\nSlug: satu", AUTHORING_LABELS) === "Tajuk: Satu\nSlug: satu", "a short answer with no section tags is left alone");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
