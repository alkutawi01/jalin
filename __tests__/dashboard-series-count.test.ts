/** Izzat (8 Okt): the admin card read "Bersiri 3" although there were two series titles (three episodes). A series counts once. */
import { countWorks } from "../src/lib/admin/dashboard-counts";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const works = [
  { id: "a", type: "bersiri", status: "published" }, { id: "b", type: "bersiri", status: "published" }, { id: "c", type: "bersiri", status: "published" },
  { id: "d", type: "cerpen", status: "published" },
];
const seriesOf = new Map([["a", "s1"], ["b", "s1"], ["c", "s2"]]);
const withSeries = countWorks(works, seriesOf);
assert(withSeries.byType.bersiri!.published === 2, "two series with three episodes read 2");
assert(withSeries.total.published === 3, "the total counts series once too (2 + 1 cerpen)");
assert(countWorks(works).byType.bersiri!.published === 3, "without series data every work is counted as before");
assert(countWorks([{ id: "x", type: "bersiri", status: "draft" }, { id: "y", type: "bersiri", status: "draft" }], new Map([["x", "s9"], ["y", "s9"]])).byType.bersiri!.pending === 1, "unfinished episodes of one series count once");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
