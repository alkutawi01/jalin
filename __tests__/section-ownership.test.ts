/**
 * /api/admin/works/A/sections/B must only reach chapter B when B belongs to work A. Before, a wrong pair of IDs read,
 * edited or deleted a chapter of another work (checked against a Neon branch: now 404 and the chapter is untouched).
 */
import fs from "node:fs";
import path from "node:path";

const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/sections/[sectionId]/route.ts"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

for (const method of ["GET", "PATCH", "DELETE"]) {
  const start = route.indexOf(`export async function ${method}(`);
  const next = route.indexOf("export async function", start + 10);
  const body = route.slice(start, next === -1 ? undefined : next);
  assert(/const \{ id: workId, sectionId \} = await params/.test(body), `${method} reads the work id from the URL`);
  assert(/\.work_id !== workId/.test(body), `${method} refuses a chapter that belongs to another work`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
