/**
 * The sentence under the title of each public list page ("Senarai Bersiri") can be edited by an editor in Tetapan.
 * It lives in the existing prompt_templates table (scope "site_copy"), so no migration is needed. The storage was run
 * against a temporary Neon branch (default, save, trim, newest wins, empty restores the default, too long refused).
 */
import fs from "node:fs";
import path from "node:path";
import { CATEGORY_TYPES, DEFAULT_CATEGORY_INTROS, isCategoryType } from "../src/lib/site-copy";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

assert(CATEGORY_TYPES.length === 5 && CATEGORY_TYPES.every((t) => DEFAULT_CATEGORY_INTROS[t].length > 10), "every list page has a default sentence");
assert(isCategoryType("bersiri") && !isCategoryType("admin") && !isCategoryType(undefined), "only the five list pages are accepted");
assert(DEFAULT_CATEGORY_INTROS.bersiri === "Siri berilustrasi untuk pembaca Jalin — sambungan demi sambungan.", "the default is the sentence readers saw before");

const page = read("src/app/kategori/[type]/page.tsx");
assert(page.includes("await categoryIntro(type)") && !page.includes("{meta.intro}"), "the list page shows the saved sentence, not a fixed one");
assert(page.includes("DEFAULT_CATEGORY_INTROS.bersiri") && !page.includes("sambungan demi sambungan."), "the default sentences live in one place");
assert(page.includes('export const dynamic = "force-dynamic"'), "an edit shows on the public page without a rebuild");

const api = read("src/app/api/admin/site-copy/route.ts");
assert((api.match(/getCurrentAdmin\(\)/g) ?? []).length === 2 && api.includes("status: 401"), "reading and saving both need an admin session");
assert(api.includes("isCategoryType(body.type)") && api.includes("status: 400"), "an unknown page or a missing text is a 400");

const settings = read("src/app/admin/settings/page.tsx");
assert(settings.includes("<SiteCopySettings />"), "Tetapan has the section");
const lib = read("src/lib/site-copy.ts");
assert(lib.includes('SCOPE = "site_copy"') && lib.includes("prompt_templates"), "stored in the existing prompt_templates table (no migration)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
