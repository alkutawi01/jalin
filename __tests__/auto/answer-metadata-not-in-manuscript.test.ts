/** The [MAKLUMAT] block that follows [KANDUNGAN] in the editor's own format must not end up at the foot of the manuscript. */
import { planEditorAnswer } from "../../src/lib/admin/authoring/editor-assistant";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const state: any = { work: { type: "cerpen", title: "Draf tanpa tajuk", slug: "draf-1", body: "", metadata: {} }, chapters: [], credits: [], glossary: [], source: null };
const answer = `[KARYA]
Tajuk: Lampu
Slug: lampu
Dek: Satu lampu.

[KANDUNGAN]
Perenggan satu.

Perenggan dua.

[MAKLUMAT]
Genre: Drama keluarga
Catatan editor: Sudut pandang.
Nota pembaca: Kematian.

[KREDIT]
Nama tetamu: Aisyah Rahim
Peranan: Penulis
`;
const changes = planEditorAnswer(answer, "all", state);
const body = String(changes.find((c) => c.key === "body")?.after ?? "");
assert(body === "Perenggan satu.\n\nPerenggan dua.", "the manuscript is only the story");
assert(!/MAKLUMAT|Catatan editor|Nota pembaca|KREDIT/.test(body), "no metadata or credit lines in the manuscript");
assert(changes.some((c) => c.key === "editorNote"), "the editor's note is still read from [MAKLUMAT]");
assert(changes.some((c) => c.key === "genre"), "and so is the genre");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
