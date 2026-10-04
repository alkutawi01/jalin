/** Error and success messages in the admin are announced by screen readers: every one carries a role. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const files = walk(path.join(__dirname, "..", "src")).filter((f) => f.endsWith(".tsx"));
const missing: string[] = [];
let errorBlocks = 0;
let successBlocks = 0;
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/admin-alert-error/.test(line)) { errorBlocks++; if (!/role="alert"/.test(line)) missing.push(`${path.relative(process.cwd(), file)}:${i + 1}`); }
    if (/admin-alert-success/.test(line)) { successBlocks++; if (!/role="status"/.test(line)) missing.push(`${path.relative(process.cwd(), file)}:${i + 1}`); }
  });
}
assert(errorBlocks > 20 && successBlocks > 5, `the scan sees the message blocks (${errorBlocks} errors, ${successBlocks} successes)`);
assert(missing.length === 0, `every error block has role="alert" and every success block role="status"${missing.length ? ` (missing: ${missing.slice(0, 5).join(", ")})` : ""}`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
