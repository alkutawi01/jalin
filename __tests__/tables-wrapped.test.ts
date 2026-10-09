/**
 * Izzat, 9 Okt 2026 (a screenshot of Tetapan > Audiens): the table ran past the edge of its card and its last columns were cut off.
 * A table outside .admin-table-wrap gets neither the sideways scroll nor the card layout, so one more table in the admin can do this again
 * the day it sits in a narrow place. Every admin table must have the wrap.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    return entry.isDirectory() ? tsxFiles(rel) : rel.endsWith(".tsx") ? [rel] : [];
  });
}

const unwrapped: string[] = [];
let tables = 0;
for (const file of [...tsxFiles("src/app/admin"), ...tsxFiles("src/components/admin")]) {
  const lines = read(file).split("\n");
  lines.forEach((line, i) => {
    if (/<table[^>]*admin-table/.test(line)) {
      tables++;
      if (!/admin-table-wrap/.test(lines.slice(Math.max(0, i - 3), i + 1).join("\n"))) unwrapped.push(`${file}:${i + 1}`);
    }
  });
}
assert(tables >= 10, `the check sees the admin tables (${tables})`);
assert(unwrapped.length === 0, `every admin table sits in .admin-table-wrap${unwrapped.length ? " (missing: " + unwrapped.join(", ") + ")" : ""}`);

const css = read("src/app/admin/admin.css");
assert(css.includes(".a-shell .a-form-list td:first-child { width: 30%; }") && !read("src/components/admin/SiteCopySettings.tsx").includes('width: "20%"') && !read("src/components/admin/AiPersonaSettings.tsx").includes('width: "35%"'), "the two name-and-box lists size their columns in CSS, so the card layout can stack them");
assert(read("src/components/admin/AudienceBandsSettings.tsx").includes('<div className="admin-table-wrap">'), "the Audiens table is wrapped");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
