/**
 * "Minit Bacaan" on a work. Emptying the box and saving said "disimpan", but the box was sent as nothing at all, so the stored
 * number stayed and came back at the next load: an editor could never return a work to the estimate from its text. And the
 * number was not checked: 2.5 reached the database's integer column (its own English error was shown), -3 was stored.
 */
import fs from "node:fs";
import path from "node:path";
import { parseReadingMinutes, READING_MINUTES_MAX } from "../src/lib/admin/reading-minutes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const refused = (value: unknown) => { try { parseReadingMinutes(value); return ""; } catch (error) { return (error as Error).message; } };

assert(parseReadingMinutes(undefined) === undefined, "not sent: the stored number is left alone");
assert(parseReadingMinutes(null) === null && parseReadingMinutes("") === null && parseReadingMinutes("  ") === null, "an emptied box removes the stored number");
assert(parseReadingMinutes(7) === 7 && parseReadingMinutes("12") === 12 && parseReadingMinutes(1) === 1 && parseReadingMinutes(READING_MINUTES_MAX) === READING_MINUTES_MAX, "a whole number of minutes is kept");
for (const bad of [2.5, "2.5", -3, "-3", 0, READING_MINUTES_MAX + 1, "sepuluh", true, [5], {}, Number.NaN, Infinity]) {
  assert(refused(bad).startsWith("Minit bacaan mesti nombor bulat"), `${JSON.stringify(bad) ?? String(bad)} is refused in Malay`, refused(bad));
}

const route = read("src/app/api/admin/works/[id]/route.ts");
assert(route.includes("readingMinutes = parseReadingMinutes(body.readingMinutes);") && /catch \(error\) \{\s*return NextResponse\.json\(\{ error: \(error as Error\)\.message \}, \{ status: 400 \}\);/.test(route) && !route.includes("readingMinutes: body.readingMinutes"), "the route checks the number and answers 400, before anything is written");
const service = read("src/lib/admin/work-service.ts");
assert(service.includes("if (input.readingMinutes !== undefined) updateData.reading_minutes = input.readingMinutes || null;"), "and null clears the column");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("readingMinutes: form.readingMinutes.trim() ? Number(form.readingMinutes) : null,") && !page.includes("Number(form.readingMinutes) : undefined"), "the form sends an emptied box as null, not as nothing");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
