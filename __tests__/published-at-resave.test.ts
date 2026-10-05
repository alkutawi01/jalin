/**
 * Every ordinary save of a published work sent back the date the form was shown and the API wrote it over published_at, resetting the time to
 * midnight UTC (a time late in the UTC day, which is already the next morning in Malaysia, ended up a day earlier). It also fed the next version
 * label, which compares days. Only a really different day is a change now.
 */
import fs from "node:fs";
import path from "node:path";
import { samePublishedDay } from "../src/lib/admin/published-day";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const stored = new Date("2026-10-05T18:15:00.494Z");
assert(samePublishedDay("2026-10-05", stored), "the day shown by the form is the stored day: not a change");
assert(samePublishedDay("2026-10-05", stored.toISOString()) && samePublishedDay(" 2026-10-05 ", stored), "also for a stored text time, ignoring spaces");
assert(!samePublishedDay("2026-10-04", stored), "a different day is a change");
assert(!samePublishedDay(undefined, stored) && !samePublishedDay("", stored) && !samePublishedDay("2026-10-05", null), "nothing sent, or nothing stored: not 'the same'");
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(route.includes("!samePublishedDay(body.publishedAt, existing.published_at)"), "the route only writes a published date that really changed");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
