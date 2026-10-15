/** Each dashboard count card opens the list it counts. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "admin", "page.tsx"), "utf8").replace(/\r\n/g, "\n");
for (const [label, href] of [
  ["Jumlah diterbitkan", "/admin/works?status=published"],
  ["Cerpen", "/admin/works?type=cerpen&status=published"],
  ["Novela", "/admin/works?type=novela&status=published"],
  ["Bersiri", "/admin/series"],
  ["Fragmen", "/admin/works?type=fragmen&status=published"],
  ["Sinopsis", "/admin/works?type=sinopsis&status=published"]
]) assert(page.includes(`["${label}", stats.counts`) && page.includes(`"${href}"]`), `${label} opens ${href}`);
assert(page.includes('<a className={`admin-stat-card a-stat-link') && page.includes("Buka senarai."), "the card is a real link with a spoken name");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
