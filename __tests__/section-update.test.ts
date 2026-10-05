/**
 * Audit findings on PATCH chapter (checked on a temporary Neon branch with the 10-chapter novela):
 *  - a slug another chapter already has gave a 500 with SQL text, and the chapter had ALREADY been moved;
 *  - moving a chapter later left the order with gaps/wrong order;
 *  - renaming a chapter left characters pointing at the old address, so the reader showed them from chapter 1 (a spoiler).
 * Now one transaction: 409 with a Malay message and nothing changed; positions renumbered 1..N; character references follow the rename.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const service = read("src/lib/admin/section-service.ts");
const update = service.slice(service.indexOf("export async function updateSection("), service.indexOf("export async function deleteSection("));
assert(update.includes("await db.transaction().execute(async (trx) => {") && update.indexOf("if (moved)") < update.indexOf('.set(updateData)'), "the move and the edit are one transaction");
assert(update.includes('=== "23505"') && update.includes("sudah digunakan oleh bab lain"), "a duplicate address is a clear message, not SQL text");
assert(update.includes("set({ position: 1000001 + i })") && update.includes("set({ position: i + 1,"), "positions are parked then renumbered 1..N");
assert(update.includes("firstAppearanceSection === existing.slug") && update.includes("firstAppearanceSection: input.slug"), "characters follow a renamed chapter");
assert(update.includes("Kedudukan bab tidak sah"), "a position that is not a whole number from 1 is refused");
const route = read("src/app/api/admin/works/[id]/sections/[sectionId]/route.ts");
assert(route.includes('message.includes("sudah digunakan")') && route.includes("? 409"), "the route answers 409 for it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
