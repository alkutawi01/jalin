/**
 * One chatbot help per work. Earlier the work page had a box at the top, a "Bantuan bot sembang" inside every tab, and a separate
 * glossary box with its own prompt: the editor could not tell how many times to ask. Now there is one box at the top (one copy, one paste,
 * once per episode), and no other copy button for the chatbot on the work page.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes('id="chatbot-fill"'), "the box at the top keeps its anchor");
assert(
  page.includes("onClick={() => void copyFillPrompt()} disabled={fillBusy}>1. Salin arahan</button>") &&
    page.includes("onClick={() => void pasteFillFromClipboard()} disabled={fillBusy}>") && page.includes('"2. Tampal & isi"'),
  "the box has the copy and the paste buttons"
);
assert(page.includes("sekali sahaja bagi satu episod") && page.includes("tiada bantuan berasingan di tab lain"), "and says it is once per episode, with no other help in the tabs");
assert((page.match(/1\. Salin arahan/g) ?? []).length === 1, "there is exactly one 'Salin arahan' for the chatbot on the work page");
assert(!page.includes("Bantuan bot sembang untuk tab") && !page.includes("Salin arahan tab ini"), "the per-tab help is gone");
assert(!page.includes("Glosari dengan bot sembang") && !page.includes("Tampal & import"), "the separate glossary box is gone");
assert(page.includes('href="#chatbot-fill"'), "the glossary tab points to the single box");
assert(page.includes("sawWholeManuscript(parsed, form.body)") && page.includes("guardWorkFill(parsed, form.body)"), "the answer is checked for the whole text and for invented names before anything is saved");
assert(page.includes("Teks di editor belum disimpan"), "unsaved text is named (prompt copy and the Penilaian AI tab) instead of 'belum mempunyai teks'");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
