/**
 * Dates on the public pages were the first ten characters of the stored text: the day in UTC. Malaysia is UTC+8, so a work
 * published between 00:00 and 08:00 there ("2026-10-05T18:30:00Z" is 02:30 on the 6th) showed the day before. A time is now read as
 * a moment and shown as the day it was in Malaysia; a date without a time is already a day and is kept.
 */
import fs from "node:fs";
import path from "node:path";
import { formatMalayDate, malaysiaDay } from "../src/lib/reader/format-date";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

assert(formatMalayDate("2026-10-05T18:30:00.000Z") === "6 Oktober 2026", "02:30 on the 6th in Malaysia is the 6th, not the 5th", formatMalayDate("2026-10-05T18:30:00.000Z"));
assert(formatMalayDate("2026-10-05T15:59:59.000Z") === "5 Oktober 2026" && formatMalayDate("2026-10-05T16:00:00.000Z") === "6 Oktober 2026", "the day changes at 16:00 UTC (midnight in Malaysia)");
assert(formatMalayDate("2026-10-05T14:15:24.513Z") === "5 Oktober 2026" && formatMalayDate("2026-10-06T01:41:35.482Z") === "6 Oktober 2026", "works published in the daytime keep their day");
assert(formatMalayDate("2026-12-31T20:00:00Z") === "1 Januari 2027", "across a year end");
assert(formatMalayDate("2026-09-21T00:00:00.000Z") === "21 September 2026" && formatMalayDate("2026-09-25T00:00:00.000Z") === "25 September 2026", "dates stored at midnight UTC keep their day");
assert(formatMalayDate("2026-09-21") === "21 September 2026" && formatMalayDate("2026-02-30") !== null, "a date without a time is kept as written");
assert(formatMalayDate(undefined) === null && formatMalayDate("") === null && formatMalayDate("bukan tarikh") === null && formatMalayDate("2026-13-01") === null && formatMalayDate("2026-10-05Tjunk") === null, "anything else is not a date");
assert(JSON.stringify(malaysiaDay("2026-03-01T17:00:00Z")) === JSON.stringify({ year: 2026, month: 3, day: 2 }), "leap or short month ends are left to the calendar");

const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
for (const file of ["src/app/page.tsx", "src/app/kategori/[type]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/page.tsx", "src/app/cari/page.tsx"]) {
  const source = read(file);
  assert(source.includes("formatMalayDate(date)") && !source.includes('"Januari"') && !source.includes("slice(0, 10)"), `${file.replace("src/app/", "")} uses the shared date, not its own copy`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
