/** The field once called "Dek" or "Ringkasan" is called "Blurb" everywhere the editor reads it, and old answers that say Dek still fill it. */
import fs from "node:fs";
import path from "node:path";
import { parseLabelledAnswer } from "../../src/lib/admin/authoring/labelled-output";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

for (const file of [
  ["src", "app", "admin", "works", "[id]", "page.tsx"],
  ["src", "app", "admin", "series", "[id]", "page.tsx"],
  ["src", "app", "admin", "series", "new", "page.tsx"],
  ["src", "app", "admin", "submissions", "[id]", "page.tsx"],
  ["src", "app", "admin", "submissions", "new", "page.tsx"]
]) assert(/<label htmlFor="dek">Blurb<\/label>/.test(read(...file)), `${file.slice(-3).join("/")}: the label says Blurb`);
assert(read("src", "lib", "admin", "publication-readiness.ts").includes('"Blurb belum diisi.'), "the readiness message says Blurb");
assert(read("src", "lib", "admin", "authoring", "output-format.ts").includes("`Blurb: (${DEK_RULE})`"), "the AI format asks for Blurb:");

const answer = (label: string) => `[KARYA]\nTajuk: Lampu\nSlug: lampu\n${label}: Satu lampu dibiarkan menyala.\n\n[KANDUNGAN]\nIsi cerita.\n`;
const withBlurb = parseLabelledAnswer(answer("Blurb"));
const withDek = parseLabelledAnswer(answer("Dek"));
assert(String(withBlurb?.raw.dek) === "Satu lampu dibiarkan menyala.", "an answer with Blurb: fills the blurb");
assert(String(withDek?.raw.dek) === "Satu lampu dibiarkan menyala.", "an old answer with Dek: still fills it");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
