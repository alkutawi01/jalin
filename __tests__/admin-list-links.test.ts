/** In every admin list (Karya, Siri, Penyumbang, ...) the title of a row is a link to that record. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const adminRoot = path.join(__dirname, "..", "src", "app", "admin");
const lists = fs.readdirSync(adminRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(adminRoot, e.name, "page.tsx"))
  .filter((f) => fs.existsSync(f));

const checked: string[] = [];
const plain: string[] = [];
for (const file of lists) {
  const src = fs.readFileSync(file, "utf8");
  const cells = [...src.matchAll(/<td className="admin-table-title">([\s\S]*?)<\/td>/g)];
  if (cells.length === 0) continue;
  checked.push(path.basename(path.dirname(file)));
  for (const cell of cells) if (!/<a\s/.test(cell[1]!)) plain.push(path.basename(path.dirname(file)));
}
assert(checked.length >= 5, `the scan sees the admin lists (${checked.join(", ")})`);
assert(plain.length === 0, `every list title is a link${plain.length ? ` (plain text in: ${[...new Set(plain)].join(", ")})` : ""}`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
