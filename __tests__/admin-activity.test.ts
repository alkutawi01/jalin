/**
 * Aktiviti (RBAC part 3, 8 Okt): who changed what. One row per change to credits, works, sections and pictures, written by the routes that
 * make the change, read on a page for the owner and the chief editor. Recording must never get in the way of the change itself.
 */
import fs from "node:fs";
import path from "node:path";
import { ACTIVITY_ACTIONS, cleanSummary, creditSummary, workSaveSummary } from "../src/lib/admin/activity";
import { can, isAllowed, permissionFor } from "../src/lib/admin/permissions";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// Text
assert(cleanSummary("  Rafiq \n  Naim\t sebagai   Penulis ") === "Rafiq Naim sebagai Penulis", "a summary is one tidy line");
assert(cleanSummary("a".repeat(500)).length === 300 && cleanSummary("a".repeat(500)).endsWith("…"), "a long summary is cut to 300 characters");
assert(cleanSummary(null) === "" && cleanSummary(undefined) === "", "nothing gives an empty line");
assert(creditSummary("rafiq-naim", "Penulis") === "rafiq-naim sebagai Penulis" && creditSummary("", "") === "Tanpa nama sebagai tanpa peranan", "a credit reads 'who sebagai role'");
assert(workSaveSummary("Anak Qasab", { title: "x", dek: "y", base: { a: 1 }, unknown: 1 }) === "Anak Qasab: tajuk, dek", "a work save names the fields it carried, in the order of the form, and ignores the rest");
assert(workSaveSummary("Anak Qasab", {}) === "Anak Qasab" && workSaveSummary("", null) === "Tanpa tajuk", "a save with no fields is just the title");
assert(Object.values(ACTIVITY_ACTIONS).every((label) => /^[A-Z]/.test(label) && label.endsWith(label.trim())), "every action has a Malay label in sentence case");

// Who may read it
assert(can("owner", "activity.read") && can("chief_editor", "activity.read") && !can("editor", "activity.read"), "owner and chief editor read the activity; an editor does not");
assert(isAllowed("chief_editor", "GET", "/admin/aktiviti") && !isAllowed("editor", "GET", "/admin/aktiviti") && permissionFor("GET", "/admin/aktiviti") === "activity.read", "the page needs activity.read");

// Wiring: each place that changes data records it, after the change
const hooks: [string, string[]][] = [
  ["src/app/api/admin/credits/route.ts", ['"credit.create"', '"credit.reorder"']],
  ["src/app/api/admin/credits/[id]/route.ts", ['"credit.update"', '"credit.delete"']],
  ["src/app/api/admin/works/route.ts", ['"work.create"']],
  ["src/app/api/admin/works/[id]/route.ts", ['"work.update"', '"work.delete"']],
  ["src/app/api/admin/works/[id]/sections/route.ts", ['"section.create"']],
  ["src/app/api/admin/works/[id]/sections/[sectionId]/route.ts", ['"section.update"', '"section.delete"']],
  ["src/app/api/admin/works/[id]/visuals/upload/route.ts", ['"visual.upload"']],
  ["src/app/api/admin/visuals/[id]/replace/route.ts", ['"visual.replace"']]
];
for (const [file, actions] of hooks) {
  const text = read(file);
  for (const action of actions) {
    const at = text.indexOf(`action: ${action}`);
    assert(at > 0 && text.slice(Math.max(0, at - 200), at).includes("await logActivity"), `${file} records ${action}`);
  }
}
const edits = ['"work.update"', '"section.update"'];
assert(edits.every((a) => (read("src/app/api/admin/works/[id]/route.ts") + read("src/app/api/admin/works/[id]/sections/[sectionId]/route.ts")).includes(`action: ${a}`) ), "the edits that are saved again and again are collapsed");
assert((read("src/app/api/admin/works/[id]/route.ts").match(/collapse: true/g) ?? []).length === 1 && (read("src/app/api/admin/works/[id]/sections/[sectionId]/route.ts").match(/collapse: true/g) ?? []).length === 1, "only saves collapse; adds and deletes always add a row");

// Recording never gets in the way
const lib = read("src/lib/admin/activity.ts");
assert(/export async function logActivity[^]*?try \{[^]*?\} catch \(error\) \{[^]*?console\.error/.test(lib), "recording is inside try/catch and only logs a failure");
assert(lib.includes("if (!hasDb()) return;") && lib.includes("if (!admin) return;"), "no database or no signed-in person records nothing, quietly");
const migration = read("src/lib/db/migrations/026_admin_activity.ts");
assert(migration.includes("CREATE TABLE IF NOT EXISTS admin_activity") && migration.includes("IF NOT EXISTS admin_activity_work") && !/DROP|ALTER|DELETE/.test(migration.replace(/down[^]*$/, "")), "the migration is additive and idempotent");

// The page
const page = read("src/app/admin/aktiviti/page.tsx");
assert(page.includes("Migration 026 perlu dijalankan dahulu.") && page.includes("listActivity") && page.includes("Semua aktiviti"), "the page says what to do when the table is missing, and can be filtered");
assert(read("src/components/admin/AdminShell.tsx").includes('href: "/admin/aktiviti"') && read("src/components/admin/AdminShell.tsx").includes('needs: "activity.read"'), "the menu offers Aktiviti only to those who may read it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
