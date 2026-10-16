/** The editor's note and the card note are visual-only fields too, and keep the dash and quote typing they had. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
assert(/<InlineRichField\n\s+id="editorNote"\n\s+labelledBy="editorNote-label"\n\s+multiline\n\s+typography\n\s+rows=\{8\}\n\s+maxLength=\{5000\}/.test(page), "the editor's note is the visual field (multi-line, 5000, typography)");
assert(/<InlineRichField\n\s+id="readerNote"\n\s+labelledBy="readerNote-label"\n\s+multiline\n\s+typography\n\s+rows=\{3\}\n\s+maxLength=\{600\}/.test(page), "the card note is the visual field (600)");
assert(!/<textarea[^>]*id="(editorNote|readerNote)"/.test(page), "no plain text box is left for them");
const field = read("src", "components", "admin", "InlineRichField.tsx");
assert(field.includes("typography?: boolean") && field.includes("dashInSelection();") && field.includes("quotesInBlock(el);"), "two hyphens become a dash and quotes follow the house style, as before");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
