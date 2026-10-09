/**
 * The list of image requests showed what an image is for as the stored word ("hero"), while the detail page said "Utama".
 * Both now use one set of labels.
 */
import fs from "node:fs";
import path from "node:path";
import { VISUAL_ROLE_LABELS, visualRoleLabel } from "../src/lib/admin/visual-role-labels";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(visualRoleLabel("hero") === "Utama" && visualRoleLabel("inline") === "Dalam teks" && visualRoleLabel("section") === "Bahagian" && visualRoleLabel("decorative") === "Hiasan", "each role has its Malay name");
assert(visualRoleLabel("sesuatu-baharu") === "sesuatu-baharu" && visualRoleLabel("toString") === "toString", "a role with no name is shown as it is stored, and never reads from the object's own methods");
assert(Object.keys(VISUAL_ROLE_LABELS).join() === "hero,inline,section,decorative", "the roles keep their order");

const list = read("src/app/admin/visual-requests/page.tsx");
assert(list.includes("{visualRoleLabel(r.visual_role)}") && !/\n\s+\{r\.visual_role\}\n/.test(list), "the list shows the Malay name, not the stored word");
const detail = read("src/app/admin/visual-requests/[id]/page.tsx");
assert(detail.includes("Object.entries(VISUAL_ROLE_LABELS)") && !detail.includes('label: "Utama"'), "the detail page takes its options from the same labels");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
