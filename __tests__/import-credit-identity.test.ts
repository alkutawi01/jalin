/** A name typed when a work is added that is an existing contributor becomes that contributor's credit, not a human guest. */
import fs from "node:fs";
import path from "node:path";
import { matchContributorSlug } from "../src/lib/admin/import/credit-identity";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const roster = [
  { slug: "izzat-anas", display_name: "Izzat Anas" },
  { slug: "claude", display_name: "Nara Zahin" },
  { slug: "chatgpt", display_name: "Rafiq Naim" },
  { slug: "rafiq-naim", display_name: "Rafiq Naim" },
  { slug: "irfan-zuhri", display_name: "Irfan Zuhri" },
  { slug: "mimo", display_name: "Amir Syafiq" }
];

assert(matchContributorSlug("Rafiq Naim", roster) === "chatgpt", "an AI persona resolves to the editor's record, not the older pen-name address");
assert(matchContributorSlug("  nara   zahin ", roster) === "claude", "case and spacing do not matter");
assert(matchContributorSlug("Izzat Anas", roster) === "izzat-anas", "a person resolves to their record");
assert(matchContributorSlug("Amir Syafiq", roster) === "mimo", "a persona with another slug is found by its name");
assert(matchContributorSlug("Penulis Tetamu Baharu", roster) === null, "an unknown name stays a guest");
assert(matchContributorSlug("", roster) === null && matchContributorSlug("   ", roster) === null, "an empty name matches nothing");
assert(matchContributorSlug("Sama Nama", [{ slug: "a", display_name: "Sama Nama" }, { slug: "b", display_name: "Sama Nama" }]) === null, "two different contributors with one name: never guess");
assert(matchContributorSlug("rafiq-naim", [{ slug: "rafiq-naim", display_name: "Lain" }]) === "rafiq-naim", "an older address with no editor record keeps its own slug");

const service = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "admin", "import", "import-service.ts"), "utf8").replace(/\r\n/g, "\n");
assert(service.includes("matchContributorSlug(credit.guestName, known)") && service.includes("guest_name: contributorSlug ? null : credit.guestName"), "the import stores the contributor and no guest name when the name matches");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
