/**
 * Changing a picture into a hero never checked for another hero, and the marker check ignored which text (the work's or a chapter's) the
 * marker belongs to and ran before the update with no lock, so two editors could both pass. The rules now live in the service, under a lock on
 * the work, for update and for create. Checked on a temporary database branch: of two pictures changed into a hero at once exactly one
 * succeeded and the hero's marker was cleared; of two pictures given the same marker at once exactly one succeeded; the same marker in a
 * chapter's own text was accepted; a crop edit on an existing hero was not judged.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const service = read("src/lib/admin/visual-service.ts");
const update = service.slice(service.indexOf("export async function updateVisual"), service.indexOf("export async function deleteVisual"));
assert(update.includes(".forUpdate()") && update.includes("becomesHero") && update.includes("Karya ini sudah mempunyai hero") && update.includes("updateData.anchor = null"), "a picture becoming a hero is refused if the work has one, and loses its marker");
assert(update.includes("movesMarker") && update.includes('"section_slug" as never, "is", null as never') && update.includes("Penanda ini sudah digunakan oleh gambar lain"), "a marker is unique within its own text (work or chapter), judged only when the change moves it");
assert(update.indexOf("forUpdate()") < update.indexOf('trx.updateTable("visuals")'), "the lock comes before the write");
const create = service.slice(service.indexOf("export async function createVisual"), service.indexOf("export async function updateVisual"));
assert(create.includes("db.transaction()") && create.includes(".forUpdate()") && create.includes("sudah mempunyai hero") && create.includes('input.role === "hero" ? null'), "creating a second hero is refused too");
assert(read("src/app/api/admin/visuals/route.ts").includes('"sudah mempunyai hero") ? 409') && read("src/app/api/admin/visuals/[id]/route.ts").includes("sudah digunakan"), "both routes answer 409");
assert(!read("src/app/api/admin/visuals/[id]/route.ts").includes('.where("anchor", "=", marker)'), "the route's own unlocked, unscoped marker check is gone");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
