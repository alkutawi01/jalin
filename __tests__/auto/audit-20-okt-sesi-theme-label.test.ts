/** Audit 19-20 Okt: a switched-off staff account closes the API at once; ThemeSync does not ask for accounts that are not open; labels focus their boxes. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

const mw = read("src", "middleware.ts");
assert(mw.includes("/api/admin/auth/status") && mw.includes("staffVerdict("), "the middleware asks the table before a staff account reaches an admin API");
assert(/role !== "owner" && pathname\.startsWith\("\/api\/admin\/"\) && pathname !== "\/api\/admin\/auth\/status"/.test(mw), "the owner is not asked and the question itself is let through (no loop)");
assert(mw.includes("verdict.role !== role"), "a changed role closes the session");
assert(mw.includes("verdict.mustChangePassword"), "a temporary password set later is enforced from the table");
const status = read("src", "app", "api", "admin", "auth", "status", "route.ts");
assert(status.includes("getCurrentAdmin()") && status.includes('"Cache-Control": "no-store"'), "the status route reads the table through getCurrentAdmin and is never cached");

const sync = read("src", "components", "reader", "ThemeSync.tsx");
assert(sync.includes("{ accounts }: { accounts: boolean }") && /if \(!accounts \|\| window\.location\.pathname\.startsWith\("\/admin"\)\)/.test(sync), "ThemeSync asks about an account only where accounts are open and never in the admin");
assert(read("src", "app", "layout.tsx").includes("<ThemeSync accounts={readerAccountsEnabled()} />"), "the layout tells ThemeSync whether accounts are open");

const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
for (const id of ["glossary-term", "glossary-meaning", "editorNote", "readerNote"]) {
  assert(page.includes(`document.getElementById("${id}")?.focus()`), `clicking the label of ${id} puts the cursor in it`);
}
assert(page.includes('missing === "term" ? "glossary-term" : "glossary-meaning"') && page.includes("Istilah diperlukan."), "saving an empty glossary entry says which box and puts the cursor there");
const field = read("src", "components", "admin", "InlineRichField.tsx");
assert(field.includes("aria-required={required || undefined}") && field.includes("aria-invalid={invalid || undefined}"), "the visual field says when it is required or left empty");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
