/**
 * Editing a glossary entry accepted a blank term or meaning (it was only judged for duplicates when non-blank) and passed other types
 * straight to the database; creating one with a number as the term threw a TypeError (a 500).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const patch = read("src/app/api/admin/glossary/[id]/route.ts");
assert(patch.includes('typeof body[field] !== "string" || !body[field].trim()') && patch.includes("tidak boleh kosong") && patch.indexOf("tidak boleh kosong") < patch.indexOf("updateGlossaryTerm(termId"), "a blank or non-text term or meaning is a 400 before anything is saved");
assert(patch.includes("body.term = body.term.trim()") && patch.includes("body.meaning = capitaliseFirst(body.meaning.trim())"), "and what is saved is trimmed (as on creation)");
const post = read("src/app/api/admin/glossary/route.ts");
assert(post.includes('typeof body.term !== "string"') && post.includes('typeof body.meaning !== "string"') && !post.includes("body.term?.trim()"), "creating with a non-text term or meaning is a 400, not a TypeError");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
