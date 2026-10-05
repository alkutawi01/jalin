/**
 * Speed: every public page is rendered on demand and reads the database (Neon, Singapore). Without a region setting the
 * functions ran in iad1 (US East; response header "x-vercel-id: sin1::iad1"), so each query crossed the Pacific and a
 * page took 0.5 to 0.8 seconds before the first byte. The functions are pinned to Singapore, next to the database.
 */
import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../vercel.json"), "utf8")) as { regions?: string[] };
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(Array.isArray(config.regions) && config.regions.length === 1 && config.regions[0] === "sin1", "functions run in Singapore (sin1), the region of the database");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
