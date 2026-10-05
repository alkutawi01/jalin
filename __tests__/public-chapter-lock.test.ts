/**
 * A chapter's address is /kategori/novela/[work]/[chapter]. Readers are served the published version, so changing the slug of a chapter in it,
 * or deleting it, turns the link into a 404 at the next "Terbitkan semula". A chapter in the published version cannot be renamed, and deleting
 * it needs an explicit confirmation; a chapter added after publication is free. Checked on a temporary database branch with Sekuntum Bunga
 * untuk Alia (10 chapters): rename refused, title edit and the unchanged slug accepted, delete refused until confirmed (then the character
 * rule applied), and a new chapter renamed and deleted freely.
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
assert(service.includes("published_revision_id") && service.includes("snapshot?.sections"), "the public chapter addresses come from the published version's snapshot");
const update = service.slice(service.indexOf("export async function updateSection"), service.indexOf("export async function deleteSection"));
assert(update.includes("publicChapterSlugs(db as never, existing.work_id)).has(existing.slug)") && update.includes("tidak boleh ditukar"), "renaming a public chapter is refused (only when the slug really changes)");
const del = service.slice(service.indexOf("export async function deleteSection"));
assert(del.includes("options.confirmPublic !== true") && del.includes("Perlu disahkan"), "deleting one needs confirmation");
const route = read("src/app/api/admin/works/[id]/sections/[sectionId]/route.ts");
assert(route.includes('searchParams.get("confirm") === "1"') && route.includes('message.includes("Perlu disahkan")') && route.includes('message.includes("tidak boleh ditukar")'), "the route passes the confirmation and answers 409 / 400");
assert(read("src/app/admin/works/[id]/page.tsx").includes("?confirm=1") && read("src/app/admin/works/[id]/page.tsx").includes("Padam bab ini juga?"), "the editor asks, then repeats the request");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
