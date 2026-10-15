/** A work started with "Tambah karya" gets the same readable number as every other work (JLN-CER-0012), not a timestamp. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const start = read("src", "app", "api", "admin", "works", "start-draft", "route.ts");
assert(start.includes("await generateWorkId(tx, input.type as WorkType)"), "start-draft uses the numbered ID generator");
assert(!start.includes("`work-${Date.now()}"), "and no longer a timestamp ID");
assert(start.includes('pg_advisory_xact_lock(hashtext(${"work-id:" + input.type}))'), "the numbering of a kind is held while a draft takes its number");
assert(start.includes("const slug = `draf-${id.toLowerCase()}`;"), "the placeholder address follows the new ID");
const service = read("src", "lib", "admin", "work-service.ts");
assert(service.includes("const id = await generateWorkId(db, input.type);") && !service.includes("`work-${Date.now()}"), "createWork does the same");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
