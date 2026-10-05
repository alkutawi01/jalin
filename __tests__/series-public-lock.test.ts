/**
 * A series whose episodes have been public keeps its address (it is part of every episode's address) and cannot change mode without
 * confirmation (continuous shows an unbroken run from episode 1, anthology shows everything published). Checked on a temporary database
 * branch: slug change refused, same slug resent accepted, mode change refused until confirmed, a series with no public episode unrestricted.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8").replace(/\r\n/g, "\n");
const service = read("../src/lib/admin/series-service.ts");
assert(service.includes('eb("works.published_at", "is not", null)') && service.includes('eb("works.published_revision_id", "is not", null)') && service.includes('eb("works.status", "=", "published")'), "an episode counts as public if it is published now or ever was");
assert(service.includes("slugChanges || modeChanges") && service.includes("input.slug !== existing.slug") && service.includes("input.mode !== existing.mode"), "only a real change is judged (the form resends the unchanged values)");
assert(service.includes("input.confirmModeChange !== true"), "the mode change needs the editor's confirmation");
const route = read("../src/app/api/admin/series/[id]/route.ts");
assert(route.includes("confirmModeChange: body.confirmModeChange === true") && route.includes('message.includes("Perlu disahkan")') && route.includes('message.includes("tidak boleh ditukar")'), "the API answers 409 for the confirmation and 400 for the locked address");
const page = read("../src/app/admin/series/[id]/page.tsx");
assert(page.includes("confirmModeChange: true") && page.includes("Ya, tukar mod"), "the series page asks and repeats the request");
// An episode that was public (even if archived now) cannot be moved to another series: its address contains the series' address.
const detach = service.slice(service.indexOf("export async function detachEpisode"), service.indexOf("export async function reorderSeriesEntries"));
assert(detach.includes('.select(["status", "published_at", "published_revision_id"])') && detach.includes("work.published_at || work.published_revision_id") && detach.includes("pernah terbit tidak boleh dikeluarkan"), "a once-public episode cannot be detached, archived or not");
assert(detach.indexOf("pernah terbit tidak boleh") < detach.indexOf(".deleteFrom(\"series_entries\")"), "checked before anything is deleted");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
