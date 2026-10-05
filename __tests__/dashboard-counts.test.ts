/** The dashboard's big number is what readers can see; unfinished works are counted beside it, archived ones left out. */
import { countWorks } from "../src/lib/admin/dashboard-counts";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const works = [
  { type: "bersiri", status: "draft" },
  { type: "cerpen", status: "published" },
  { type: "cerpen", status: "published" },
  { type: "cerpen", status: "review" },
  { type: "novela", status: "published" },
  { type: "novela", status: "archived" },
  { type: "fragmen", status: "ready" },
  { type: "sinopsis", status: "published" },
];
const { total, byType } = countWorks(works);

assert(byType.bersiri!.published === 0 && byType.bersiri!.pending === 1, "one unfinished Bersiri draft is not a published Bersiri");
assert(byType.cerpen!.published === 2 && byType.cerpen!.pending === 1, "published and unfinished are counted apart");
assert(byType.novela!.published === 1 && byType.novela!.pending === 0, "an archived work is counted nowhere");
assert(byType.fragmen!.published === 0 && byType.fragmen!.pending === 1, "a work marked ready but not yet published is still pending");
assert(total.published === 4 && total.pending === 3, "the total follows the same rule");
assert(countWorks([{ type: "lain", status: "published" }]).total.published === 1, "an unknown kind still counts in the total");
assert(countWorks([]).total.published === 0 && countWorks([]).byType.cerpen!.pending === 0, "an empty library is all zeros");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
