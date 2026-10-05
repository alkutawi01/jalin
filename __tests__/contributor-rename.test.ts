/**
 * Audit finding: changing a contributor's address ("Alamat pautan") failed with a foreign-key error as soon as the contributor had one credit
 * (credits.contributor_slug has no ON UPDATE CASCADE). Now a new record is made under the new address, the references move, the old one is
 * removed; and a contributor credited on a published work cannot be renamed (the frozen published version names them by the old address).
 * Run against a temporary Neon branch: rename with a credit worked and moved it; a contributor on published works was refused.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/contributor-service.ts"), "utf8").replace(/\r\n/g, "\n");
assert(src.includes("const renaming = Boolean(input.slug && input.slug !== slug)"), "a rename is told apart from an ordinary edit");
assert(src.includes('.insertInto("contributors").values({ ...old, ...updateData, slug: input.slug as string }') && src.indexOf('.insertInto("contributors")') < src.indexOf('.updateTable("credits")') && src.indexOf('.updateTable("credits")') < src.indexOf('.deleteFrom("contributors")'), "new record first, then the credits move, then the old record goes");
assert(src.includes('.where("works.status", "=", "published")') && src.includes("Alamat pautan tidak boleh ditukar"), "a contributor on a published work keeps their address");
assert(!/\.updateTable\("contributors"\)[\s\S]{0,200}\.set\(updateData\)[\s\S]{0,400}\.updateTable\("credits"\)/.test(src.replace(/if \(!renaming\)[\s\S]*?return;\n    \}/, "")), "the slug is never changed in place under existing credits");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
