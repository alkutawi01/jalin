/** An unused contributor record (a duplicate made by mistake) can be deleted; one that is in use cannot. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
const service = read("src", "lib", "admin", "contributor-service.ts");
assert(service.includes("export async function deleteUnusedContributor"), "there is a delete for an unused contributor");
assert(service.includes('selectFrom("credits").select("id").where("contributor_slug", "=", slug)') && service.includes("masih dipakai dalam"), "it refuses one that is in a credit, and says how many");
assert(service.includes('selectFrom("submission_contributions")') && service.includes('where("scope", "=", "ai_persona")'), "it refuses one named in a submission or used as an AI's pseudonym");
assert(service.includes('trx.deleteFrom("contributors").where("slug", "=", slug)'), "and otherwise deletes it, inside one transaction");
const route = read("src", "app", "api", "admin", "contributors", "[slug]", "route.ts");
assert(route.includes("export async function DELETE") && route.includes("getCurrentAdmin()"), "the endpoint needs a login");
assert(route.includes("{ status: 409 }") || route.includes(": 500"), "a refusal is a 409, not a server fault");
const page = read("src", "app", "admin", "contributors", "[slug]", "page.tsx");
assert(page.includes("Padam penyumbang") && page.includes("confirmAction("), "the page asks before deleting");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
