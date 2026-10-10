import { visibleSampleCount } from "../src/lib/reader/sample-count";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

// Whatever the number of chosen samples, 3 or 4 to a row never leaves one card alone on the last row.
for (let n = 0; n <= 40; n++) {
  const k = visibleSampleCount(n);
  const alone3 = k > 3 && k % 3 === 1;
  const alone4 = k > 4 && k % 4 === 1;
  assert(k <= n && k <= 12 && !alone3 && !alone4, `${n} samples show ${k}, no card alone in a row of 3 or 4`);
}
assert(visibleSampleCount(6) === 6 && visibleSampleCount(8) === 8 && visibleSampleCount(12) === 12 && visibleSampleCount(3) === 3, "3, 6, 8 and 12 are all shown");
assert(visibleSampleCount(5) === 3 && visibleSampleCount(4) === 3, "4 and 5 are rounded down to 3");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
