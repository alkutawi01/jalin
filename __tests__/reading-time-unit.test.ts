/** Reading time is always written with its unit in full ("± 12 minit"), never as a bare "min". */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(path.join(__dirname, "../src"));
const offenders = files.flatMap((file) =>
  fs.readFileSync(file, "utf8").split("\n").map((line, i) => ({ file, line, n: i + 1 }))
    .filter(({ line }) => /(?:minutes|Minutes|reading_minutes|"\?")\}? min\b(?!it)/.test(line))
    .map(({ file: f, n }) => `${path.relative(path.join(__dirname, ".."), f)}:${n}`)
);
assert(files.length > 20, `scanned the interface (${files.length} files)`);
assert(offenders.length === 0, `no reading time is written with a bare "min"${offenders.length ? ": " + offenders.join(", ") : ""}`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
