/** The dashboard's confirmed weaknesses (16 Okt): honest status, errors with a reason, a deliberate stats grid, one-line empty states. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..", "..", "src", "app", "admin");
const page = fs.readFileSync(path.join(root, "page.tsx"), "utf8").replace(/\r\n/g, "\n");
const css = fs.readFileSync(path.join(root, "admin.css"), "utf8").replace(/\r\n/g, "\n");

assert(page.includes("sql`select 1`") && page.includes("dbCheck.ok ? \"Menjawab\""), "the database chip comes from a real query, not from DATABASE_URL being set");
assert(page.includes("Dikonfigurasi (tidak diuji)") && !page.includes('"Ditetapkan"') && !page.includes('"Bersambung"'), "storage is only said to be configured, and 'Bersambung' is not claimed");
assert(page.includes("Senarai kerja tidak dapat dimuat.") && page.includes("Semakan kandungan tidak dapat dijalankan.") && page.includes("Cuba lagi"), "a failed list or check says why and offers to try again");
assert(!page.includes("// Ignore errors for now"), "errors are no longer swallowed");
assert(page.includes('href="/admin/works/add" className="admin-btn admin-btn-primary admin-btn-sm">Tambah karya'), "the empty to-do offers a Tambah karya button");
assert(!page.includes("di sebelah kiri"), "no 'on the left' instruction");
assert((page.match(/<thead className="a-visually-hidden">/g) ?? []).length === 2, "both tables have a header row for screen readers");
assert(page.includes("<summary>Alat lanjutan</summary>") && !page.includes("jarang diperlukan"), "the tools heading is professional");
assert(page.includes('"Jumlah diterbitkan"') && page.includes("is-total"), "the total is told apart from its parts");
assert(page.includes("{systemOk ? (") && page.includes("a-system-line"), "the system status is a line when all is well");
assert(css.includes("@container (min-width: 860px) { .a-shell .a-stats { grid-template-columns: repeat(6") && css.includes("repeat(3, minmax(0, 1fr))") && css.includes("repeat(2, minmax(0, 1fr))"), "the type cards go 6 across, 3 by 2, or 2 by 3");
assert(css.includes("prefers-reduced-motion: reduce) { .a-side, .a-main { transition: none; } }"), "the sidebar does not animate for those who ask for less motion");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
