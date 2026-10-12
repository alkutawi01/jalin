/**
 * The editor's flow: (1) the main instruction at the top of the work page, copied with the manuscript, pasted to the chatbot, the answer pasted
 * back ("Tampal & isi"); (2) the manuscript may be put in Kandungan before or after; (3) if a tab has a problem, a focused instruction in that
 * tab, which is a different, narrower prompt. The main box and the tab help must be told apart, and neither blocks when Kandungan is empty.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes('id="chatbot-fill"'), "the main box at the top keeps its anchor");
assert(
  page.includes("onClick={() => void copyFillPrompt()} disabled={fillBusy}>1. Salin arahan</button>") &&
    page.includes("onClick={() => void pasteFillFromClipboard()} disabled={fillBusy}>") && page.includes('"2. Tampal & isi"'),
  "the main box has the copy and the paste buttons"
);
assert(page.includes("arahan utama, sekali bagi satu episod"), "the main box says it is the main instruction, once per episode");
assert(page.includes("Semakan fokus untuk tab") && page.includes("berbeza daripada kotak utama"), "each tab has a focused help that says how it differs from the main box");
assert(page.includes("Salin arahan fokus untuk tab ini"), "the focused help has its own button wording");
assert(page.includes("Glosari dengan bot sembang"), "the glossary tab keeps its own focused glossary instruction");
assert((page.match(/1\. Salin arahan<\/button>/g) ?? []).length === 2, "the plain '1. Salin arahan' pair is only in the main box and the glossary tab");
assert(!page.includes("Karya ini belum mempunyai teks. Isi tab Kandungan"), "copying the instruction is not blocked when Kandungan is empty");
assert(page.includes("const hasText = form.body.trim().length > 0;") && page.includes("hasText && parsed.sections.length > 0 && !sawWholeManuscript"), "the whole-text proof and the name check run only when Kandungan holds the text");
assert(page.includes("Teks di editor belum disimpan"), "unsaved text in the Penilaian AI tab is named");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
