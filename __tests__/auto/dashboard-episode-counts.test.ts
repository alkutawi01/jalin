/** The Bersiri card counts series, and says how many published episodes those are; the total says how many works the list will show. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "admin", "page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes('work.status === "published" && work.type === "bersiri"'), "episodes are published works of type bersiri");
assert(page.includes("{stats.entries.episodes} episod diterbitkan"), "the Bersiri card shows the episode count");
assert(page.includes("{stats.entries.works} termasuk setiap episod"), "the total card shows the count of works the list shows");
assert(page.includes('label === "Bersiri" && stats.entries'), "only the Bersiri card gets the episode line");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
