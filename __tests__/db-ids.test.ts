/** Ids from a URL: plain positive whole numbers that fit a database integer, nothing else. */
import { parseDbId } from "../src/lib/admin/ids";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(parseDbId("7") === 7, "a plain number is accepted");
assert(parseDbId("2147483647") === 2147483647, "the largest database integer is accepted");
assert(Number.isNaN(parseDbId("2147483648")), "one past the largest integer is refused");
assert(Number.isNaN(parseDbId("99999999999999999999")), "a huge number is refused");
assert(Number.isNaN(parseDbId("abc")), "letters are refused");
assert(Number.isNaN(parseDbId("12abc")), "digits followed by letters are refused (parseInt would take 12)");
assert(Number.isNaN(parseDbId("-5")) && Number.isNaN(parseDbId("0")), "zero and negatives are refused");
assert(Number.isNaN(parseDbId("1.5")) && Number.isNaN(parseDbId("1e3")), "decimals and exponents are refused");
assert(Number.isNaN(parseDbId("")) && Number.isNaN(parseDbId(null)) && Number.isNaN(parseDbId(undefined)), "empty and missing are refused");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
