/** The contributor page printed the same disclosure sentence twice, the second cut short ("Identiti ini ialah persona editorial"). */
import fs from "node:fs";
import path from "node:path";
import { disclosureToShow } from "../src/lib/reader/contributor-disclosure";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const bio = "Rafiq ialah penulis maya.\n\nIdentiti ini ialah persona editorial Jalin, bukan manusia sebenar.";
assert(disclosureToShow(bio, "Identiti ini ialah persona editorial") === null, "a disclosure the bio already contains is left out");
assert(disclosureToShow("**Identiti ini ialah persona editorial Jalin**, bukan manusia sebenar.", "Identiti ini ialah persona editorial Jalin.") === null, "also when the bio marks it up");
assert(disclosureToShow("Rafiq ialah penulis.", "Penulis maya Jalin yang bekerja di bawah kawal selia editorial manusia.") === "Penulis maya Jalin yang bekerja di bawah kawal selia editorial manusia.", "a disclosure that adds something is shown");
assert((disclosureToShow("Bio.", "") ?? "").startsWith("Persona ini ialah identiti editorial maya Jalin"), "an empty disclosure shows the standard line");
assert(disclosureToShow("Bio.", null) !== null, "so does a missing one");

// the seed script cut the sentence at the first "persona editorial"
const seed = fs.readFileSync(path.join(__dirname, "../scripts/db-seed.ts"), "utf8");
const m = /bio\.match\((\/Identiti ini.*?\/)\);/.exec(seed);
const re = m ? new RegExp(m[1]!.slice(1, -1)) : null;
const file = fs.readFileSync(path.join(__dirname, "../content/contributors/chatgpt.md"), "utf8");
assert(!!re && re.exec(file)?.[0] === "Identiti ini ialah persona editorial Jalin, bukan manusia sebenar.", "the seed keeps the whole sentence");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
