/**
 * Wording (Izzat, 9 Okt 2026): "Aksi" is not the Malay word for a column of buttons; the column is called "Tindakan" everywhere in the admin.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }

const files: string[] = [];
(function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name)) files.push(full);
  }
})(path.join(__dirname, "..", "src"));

const withAksi = files.filter((file) => /<th[^>]*>\s*Aksi\s*<\/th>/.test(fs.readFileSync(file, "utf8")));
assert(withAksi.length === 0, `no table heading says "Aksi" (${withAksi.map((f) => path.basename(f)).join(", ")})`);
const withTindakan = files.filter((file) => /<th[^>]*>\s*Tindakan\s*<\/th>/.test(fs.readFileSync(file, "utf8")));
assert(withTindakan.length >= 10, `the scan sees the columns of actions (${withTindakan.length} files)`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
