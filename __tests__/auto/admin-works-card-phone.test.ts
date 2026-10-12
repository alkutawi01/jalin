/** On a phone the admin works list gives the title the line: kind and status wrap to the second line, not beside a squeezed title. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "admin", "admin.css"), "utf8").replace(/\r\n/g, "\n");
const at = css.indexOf("@container admin-table (max-width: 560px) {");
const block = at >= 0 ? css.slice(at, css.indexOf("\n}\n", at) + 3) : "";

assert(at > 0, "there is a phone card block in the admin sheet");
assert(block.includes("td.admin-table-title { flex: 1 1 calc(100% - 52px); min-width: 0; overflow-wrap: anywhere; }"), "the title takes the line less the tick, so the kind and the status wrap under it");
assert(!/td\.admin-table-title \{ flex: 1 1 0;/.test(block), "no zero basis: with it the kind and status shared the first line and squeezed the title to one word");
assert(block.includes("tr { display: flex; flex-wrap: wrap;"), "the row still wraps");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
