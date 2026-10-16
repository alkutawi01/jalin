/** Codex audit of 16 Oct: reasons shown, long titles wrap, nothing dropped silently, progress shown, readable labels. */
import fs from "node:fs";
import path from "node:path";
import { firstUnsupportedLine, canEditVisually } from "../../src/components/admin/VisualManuscriptEditor";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8").replace(/\r\n/g, "\n");

const css = read("src/app/admin/admin.css");
assert(!/admin-work-blocker \{ display: none; \}/.test(css), "the reason a work cannot be published is not hidden in the compact table");
assert(css.includes("-webkit-line-clamp: 2"), "a long title wraps to two lines");
assert(read("src/components/admin/EditorAssistant.tsx").includes('"Mengisi…" : "2. Tampal jawapan"'), "Tampal jawapan shows progress");
const table = read("src/components/admin/AdminWorksTable.tsx");
assert(!table.includes("akan dikeluarkan dan"), "a fourth pick no longer drops the first silently");
assert(table.includes("Keluarkan satu dahulu"), "a fourth pick tells the editor to remove one first");
assert(read("src/app/globals.css").includes(".series-feature-overlay .series-feature-meta { font-size: 11px; }"), "category label is 11px on the phone");
assert(read("src/app/admin/works/[id]/page.tsx").includes("Teks & maklumat:"), "the save line says what it covers");

assert(firstUnsupportedLine("Biasa.\n\nPaut [x](http://a.b) di sini") === "Paut [x](http://a.b) di sini", "names the line that blocks visual editing");
assert(firstUnsupportedLine("Hanya teks *condong*.") === null && canEditVisually("Hanya teks *condong*."), "plain text has no blocking line");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
