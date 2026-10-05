/**
 * Attaching an episode accepted any position (NaN reached the database as a 500, 0 or -3 or 1.5 were stored, 9 in a series of two left a gap),
 * although everything else in a series assumes an unbroken 1..N.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const service = fs.readFileSync(path.join(__dirname, "../src/lib/admin/series-service.ts"), "utf8").replace(/\r\n/g, "\n");
const start = service.indexOf("export async function attachEpisode");
const body = service.slice(start, service.indexOf("export async function detachEpisode"));
assert(body.includes("!Number.isInteger(position) || position < 1 || position > (maxEntry?.position ?? 0) + 1"), "only a whole number from 1 to one past the last episode is accepted");
assert(body.indexOf("Kedudukan tidak sah") < body.indexOf(".insertInto(\"series_entries\")"), "checked before anything is written");
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/series/[id]/entries/route.ts"), "utf8");
assert(route.includes('message.includes("tidak sah")') && route.includes("? 400"), "and answered as a 400, not a 500");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
