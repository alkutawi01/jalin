/**
 * Izzat: the admin dashboard is "sangat serabut, tak mesra pentadbir" (screenshot of the opened technical section):
 *  - English buttons and filters (Run Audit, Sync Issues, Export Report, All/Open/Resolved/Ignored, Mark Resolved);
 *  - raw keys run together ("authorsFAIL", "visualsWARNING", "JUMLAH 0");
 *  - the same thing three times (health cards, "Kesihatan", "Isu", "Sejarah Audit" and "Audit Terkini");
 *  - failing checks were only a count per card, with no way to reach the work;
 *  - "Kredit visual" warned about every published work that had a picture ("N visual tanpa kredit"), but a picture has no
 *    credit field, so the warning could never go away. The thing that can really be missing is where the picture came from.
 * Now: a plain "Semakan kandungan" with the works that need attention and a button to fix each, and the tools folded away in Malay.
 * Checked in a browser on a temporary Neon branch (dashboard, both buttons, the history and the issue list).
 */
import fs from "node:fs";
import path from "node:path";
import { buildContentChecks, CHECKS_SHOWN, hrefFor, statusLabel } from "../src/lib/admin/dashboard-labels";
import type { EditorialHealth, HealthCategory, HealthItem } from "../src/lib/admin/editorial-health";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const item = (n: number, tab: HealthItem["tab"], text: string): HealthItem => ({ workId: `W${n}`, title: `Karya ${n}`, message: `Karya ${n} ${text}`, tab });
const category = (status: HealthCategory["status"], items: HealthItem[]): HealthCategory => ({ status, issues: items.map((i) => i.message), items });
const health: EditorialHealth = {
  authors: category("fail", [item(1, "credits", "tiada penulis awam"), item(2, "credits", "tiada penulis awam")]),
  revisions: category("pass", []),
  visuals: category("warning", Array.from({ length: 8 }, (_, i) => item(i + 10, "content", "1 imej tiada rekod asal"))),
  translations: category("pass", [])
};
const checks = buildContentChecks(health);

assert(checks.needAttention.map((r) => r.key).join() === "authors,visuals", "only the checks that need attention are listed, the failing one first", checks.needAttention.map((r) => r.key));
assert(checks.passed.join(", ") === "Versi terbit, Jenis lama", "the passed checks are one short line", checks.passed);
assert(checks.needAttention[0]!.statusLabel === "Perlu dibaiki" && checks.needAttention[1]!.statusLabel === "Perlu perhatian", "statuses are plain Malay");
assert(checks.needAttention[0]!.shown[0]!.href === "/admin/works/W1#credits", "each row links to the tab of the work that fixes it", checks.needAttention[0]!.shown[0]);
assert(hrefFor(item(3, "content", "x")) === "/admin/works/W3#content", "an image problem opens the content tab");
const visuals = checks.needAttention[1]!;
assert(visuals.shown.length === CHECKS_SHOWN && visuals.hidden === 3 && visuals.total === 8, "a long list shows the first five and says how many more", { shown: visuals.shown.length, hidden: visuals.hidden });
assert(buildContentChecks({ ...health, authors: category("pass", []), visuals: category("pass", []) }).needAttention.length === 0, "when everything passes nothing is listed");
assert(statusLabel("pass") === "Lulus" && statusLabel("weird") === "weird", "an unknown status is shown as it is rather than hidden");

// the check that used to be noise
const healthSource = read("src/lib/admin/editorial-health.ts");
assert(healthSource.includes("!String(v.provider ?? \"\").trim()") && !/const message = `[^`]*visual tanpa kredit/.test(healthSource) && healthSource.includes("imej tiada rekod asal"), "the picture check looks for a missing recorded source, not for every picture");
assert((healthSource.match(/\.items\.push\(/g) ?? []).length === 4, "every check records which work it is about");

// the page and the components
const page = read("src/app/admin/page.tsx");
assert(page.includes("Semakan kandungan") && page.includes("buildContentChecks("), "the dashboard shows the plain checks");
assert(/<details className="admin-section a-tech">/.test(page) && !/<details[^>]*\bopen\b/.test(page), "the tools stay folded until needed");
// On a 375px phone the to-do rows (title, type, Buka) were wider than their card because every table's first column is at least 190px,
// so the only action, Buka, sat behind a horizontal scroll. This table lets its title wrap, even a single very long word.
const adminCss = read("src/app/admin/admin.css");
assert(page.includes('className="admin-table a-todo-table"'), "the to-do table has its own class");
assert(adminCss.includes(".a-shell .a-todo-table td:first-child { min-width: 0; overflow-wrap: anywhere; }"), "its title column may shrink and break long words");
assert(/@media \(max-width: 480px\) \{ \.a-shell \.a-todo-table td \{ padding: 12px 10px; \} \}/.test(adminCss), "its cells are tighter on a phone");
assert(adminCss.indexOf(".a-todo-table td:first-child") > adminCss.indexOf(".admin-table td:first-child { min-width: 190px; }"), "the override comes after the 190px rule it replaces");
for (const gone of ["Aliran Editorial", "Kesihatan Editorial", "Sejarah Audit", "Isu Editorial", "healthLabel("]) {
  assert(!page.includes(gone), `the dashboard no longer has "${gone}"`);
}
const english = /Run Audit|Sync Issues|Export Report|Mark Resolved|>Ignore<|Audit completed|Failed to|Synced:|\.toUpperCase\(\)/;
for (const file of ["src/app/admin/page.tsx", "src/components/admin/EditorialWorkflowDashboard.tsx", "src/components/admin/EditorialIssueQueue.tsx", "src/components/admin/EditorialAuditHistory.tsx", "src/components/admin/ExportReportButton.tsx", "src/lib/admin/editorial-actions.ts"]) {
  assert(!english.test(read(file)), `${file} has no English labels or shouted raw statuses`);
}
assert(read("src/components/admin/EditorialWorkflowDashboard.tsx").includes("Jalankan semakan") && read("src/components/admin/EditorialIssueQueue.tsx").includes("Tandakan selesai"), "the buttons are in Malay");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
