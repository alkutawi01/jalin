/** The format block pasted into "Tambah Karya" instead of an answer must not become a work (placeholders and the example character). */
import { getRecipe } from "../src/lib/admin/authoring/recipes";
import { buildFormatBlock } from "../src/lib/admin/authoring/output-format";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
for (const key of ["cerpen.data", "bersiri.data", "novela.data"]) {
  assert(parseLabelledAnswer(buildFormatBlock(getRecipe(key as never))) === null, `${key}: the format block pasted back is not read as an answer`);
}
const answer = `[KARYA]
Jenis: cerpen
Tajuk: Kunci Almari Lama
Slug: kunci-almari-lama
Dek: (satu genre dalam satu atau dua patah perkataan)
Genre: misteri keluarga

[WATAK]
Nama: Ida
Peranan: Cucu perempuan`;
const r = parseLabelledAnswer(answer);
assert(!!r && (r.raw as { title: string }).title === "Kunci Almari Lama" && (r.raw as { dek: string }).dek === "", "a real answer is read, and a leftover placeholder in it is blanked");
assert(((r!.raw as { characters?: Array<{ name: string }> }).characters ?? []).some((c) => c.name === "Ida"), "real characters are kept");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
