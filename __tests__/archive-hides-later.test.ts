/**
 * In a continuous series readers see a published run from episode 1 only, so archiving an episode in the middle hides the published ones after
 * it. The editor is now told which, and asked, before it happens (checked on a temporary database branch: position 1 of 3 names the two
 * after it, position 2 names one, the last and every anthology episode name none).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8").replace(/\r\n/g, "\n");
const service = read("../src/lib/admin/series-hidden-by-archive.ts");
assert(service.includes('"series.mode", "=", "continuous"') && service.includes('"series_entries.position", ">"') && service.includes('"works.status", "=", "published"'), "only continuous series, only later positions, only published episodes count");
const route = read("../src/app/api/admin/works/[id]/route.ts");
const guard = route.indexOf("episodesHiddenByArchiving(id)");
assert(guard > 0 && route.slice(guard - 200, guard + 500).includes("status: 409") && route.includes("body.confirmHidesLater !== true"), "the API answers 409 naming the episodes unless the editor already confirmed");
assert(guard < route.indexOf("await updateWork(id"), "before anything is written");
const page = read("../src/app/admin/works/[id]/page.tsx");
assert(page.includes("res.status === 409") && page.includes("confirmHidesLater: true") && page.includes("Teruskan mengarkibkan?"), "the Arkibkan button asks, then repeats the request with the confirmation");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
