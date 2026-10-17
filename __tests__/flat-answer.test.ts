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

// A third kind of copy: the paragraphs are glued ("William.Pengalaman") and a section tag follows the last word with no space.
const glued = "[KARYA] Tajuk: Anak-anak Kereta Api Slug: anak-anak-kereta-api Blurb: Kehidupan tiga beradik berubah apabila bapa mereka tiba-tiba tiada di rumah.[KANDUNGAN]Roberta yang dipanggil Bobbie hidup bahagia.Keluarga itu berpindah ke Three Chimneys.[MAKLUMAT]Genre: Fiksyen kanak-kanak Catatan: Sinopsis novel The Railway Children.[WATAK]Nama: Bobbie Peranan: Anak sulung ____ Nama: Peter Peranan: Adik lelaki[SUMBER]Tajuk asal: The Railway Children Pengarang asal: E. Nesbit Bahasa asal: Inggeris Tahun terbit pertama: 1906 Penerbit: tidak dinyatakan";
const wrapped = `<escape>${tidy}</escape>`;
const fenced = "```\n" + tidy + "\n```";
const fencedWithName = "```text\n" + tidy + "\n```\n";
const flatWithHead = flat.replace(/^/, "[KARYA] Tajuk: ");

const state = { work: { type: "sinopsis", title: "Draf tanpa tajuk", slug: "draf-jln-sin-0006", body: "", metadata: {} }, chapters: [], credits: [], glossary: [], source: null };
const bodyOf = (changes: Array<{ id: string; after: string }>) => changes.find((change) => change.id === "content:body")?.after ?? "";
const field = (changes: Array<{ id: string; after: string }>, id: string) => changes.find((change) => change.id === id)?.after ?? "";

for (const [name, text] of [["tidy", tidy], ["wrapped in <escape>", wrapped], ["inside a code block (what the new prompt asks for)", fenced], ["inside a named code block", fencedWithName], ["flat without the opening tag", flat], ["flat with the opening tag", flatWithHead], ["glued paragraphs", glued]] as const) {
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

// Items separated only by blank lines (glossary, places), a label glued to the full stop before it, and a web address given as a link to itself.
const mixed = "[KARYA] Tajuk: X Slug: x Blurb: Satu dua.[KANDUNGAN]Satu perenggan.Dua perenggan.[LATAR] Jenis: tempat Nama: Raveloe Keterangan: Desa.\n\nJenis: masa Nama: Akhir abad Keterangan: Era.[GLOSARI] Istilah: candu Maksud: Bahan narkotik.\n\nIstilah: kuari Maksud: Kawasan penggalian batu.\n\nIstilah: doktrinal Maksud: Berkaitan dengan ajaran.Asing: tiada[SUMBER] Tajuk asal: Silas Marner Pengarang asal: George Eliot Bahasa asal: Inggeris Tahun terbit pertama: 1861 URL sumber: [https://www.gutenberg.org/ebooks/550](https://www.gutenberg.org/ebooks/550?utm_source=chatgpt.com) Nama edisi: Project Gutenberg";
const mixedChanges = planEditorAnswer(mixed, "all", state as never) as Array<{ id: string; after: unknown }>;
const ids = mixedChanges.map((change) => change.id);
assert(["glossary:glossary/candu", "glossary:glossary/kuari", "glossary:glossary/doktrinal"].every((id) => ids.includes(id)), "glossary items separated only by blank lines are three items");
assert(!JSON.stringify(mixedChanges.find((change) => change.id === "glossary:glossary/doktrinal")?.after).includes("Asing"), "the Asing line glued to the last meaning is not part of the meaning");
assert(mixedChanges.find((change) => change.id === "source:sourceUrl")?.after === "https://www.gutenberg.org/ebooks/550", "a web address given as a link to itself is read as the address, without the tracking tag");
assert(mixedChanges.find((change) => change.id === "source:sourceEdition")?.after === "Project Gutenberg", "the edition name is read");
assert(ids.includes("characters:places/Raveloe") && ids.includes("characters:times/Akhir abad"), "places and times separated only by blank lines are read");

// Tags on their own lines, but every glossary item on ONE line and the items separated by blank lines (a real Black Beauty answer).
const crowded = "[KARYA]\nTajuk: X\nSlug: x\nBlurb: Satu dua.\n\n[KANDUNGAN]\nSatu perenggan.\n\nDua perenggan.\n\n[GLOSARI]\n\nIstilah: kuda padi Maksud: Kuda kecil. Asing: tiada\n\nIstilah: ladam Maksud: Besi pada kuku kuda. Asing: tiada\n\n[SUMBER]\n\nTajuk asal: Y\nPengarang asal: Z\n";
const crowdedChanges = planEditorAnswer(crowded, "all", state as never) as Array<{ id: string; after: unknown }>;
const crowdedIds = crowdedChanges.map((change) => change.id);
assert(crowdedIds.includes("glossary:glossary/kuda padi") && crowdedIds.includes("glossary:glossary/ladam"), "glossary items written one per line (Istilah, Maksud and Asing together) are read");
assert(crowdedChanges.find((change) => change.id === "content:body")?.after === "Satu perenggan.\n\nDua perenggan.", "the prose is kept exactly as it came");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
