/** A test placed in __tests__/auto/ is run by `npm test` without any edit of package.json. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const script = fs.readFileSync(path.join(root, "scripts", "run-auto-tests.cjs"), "utf8");

assert(String(pkg.scripts.test).trim().endsWith("node scripts/run-auto-tests.cjs"), "the test script ends by running the auto tests, so a test in __tests__/auto/ is part of `npm test`");
assert(script.includes('path.join(root, "__tests__", "auto")') && script.includes("tsx?$") && script.includes("test"), "the runner takes every .test.ts and .test.tsx in the folder");
assert(script.includes("process.exit(failed ? 1 : 0)"), "one failing test fails the run");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
