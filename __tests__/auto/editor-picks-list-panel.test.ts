/** The works page lists the editor's picks in a short panel above the table, so they are not found by scrolling a table of any length. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..", "..", "src");
const table = fs.readFileSync(path.join(root, "components", "admin", "AdminWorksTable.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app", "admin", "admin.css"), "utf8");
assert(table.includes('aria-labelledby="admin-pick-panel-title"') && table.includes("Pilihan Editor semasa ("), "there is a panel titled with the number of picks");
assert(table.includes("draft.map((work, index)") && table.includes('className="admin-pick-list"'), "it lists each pick in order from the working copy");
assert(table.includes("Keluarkan ${work.title} daripada Pilihan Editor") && table.includes("removePick(work)"), "a pick can be taken out from the panel");
assert(table.includes("Belum ada pilihan."), "an empty list says how to add one");
assert(table.indexOf("admin-pick-panel") < table.indexOf('<table className="admin-table admin-works-table'), "the panel is above the table");
assert(css.includes(".admin-pick-panel") && css.includes(".admin-pick-list"), "the panel is styled");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
