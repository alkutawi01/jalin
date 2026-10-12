/** The homepage figures count up from 0 and never show "-0" (a frame timestamp can precede the start time). */
import fs from "node:fs";
import path from "node:path";
import { countUpValue } from "../src/lib/reader/count-up-value";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const format = new Intl.NumberFormat("ms-MY");

assert(countUpValue(15, -0.4, 1400) === 0 && !Object.is(countUpValue(15, -0.4, 1400), -0), "a frame a hair before the start is 0, not -0");
assert(format.format(countUpValue(2, -1, 1400)) === "0", "it formats as 0, not -0");
assert(countUpValue(15, 0, 1400) === 0, "it starts at 0");
assert(countUpValue(15, 1400, 1400) === 15 && countUpValue(15, 99999, 1400) === 15, "it ends exactly on the value and never passes it");
let monotonic = true, last = 0, inRange = true;
for (let ms = -50; ms <= 1500; ms += 7) {
  const v = countUpValue(60, ms, 1400);
  if (v < last) monotonic = false;
  if (v < 0 || v > 60 || Object.is(v, -0)) inRange = false;
  last = v;
}
assert(monotonic && inRange, "over the whole run it only rises, within 0 and the value");

const comp = fs.readFileSync(path.join(__dirname, "..", "src", "components", "reader", "CountUp.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(comp.includes("countUpValue(value, elapsed, DURATION_MS)") && !comp.includes("Math.round(value * (1 - Math.pow"), "the component uses it");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
