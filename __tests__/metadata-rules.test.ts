/** Glossary terms are unique per work; a character cannot first appear in a chapter that does not exist. */
import { characterProblems, findDuplicateTerm, sameTerm } from "../src/lib/admin/metadata-rules";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(sameTerm("Perkara", " perkara "), "terms are the same ignoring case and surrounding spaces");
assert(!sameTerm("perkara", "perkaranya"), "different words are different terms");
const list = [{ id: 1, term: "emas bertahil" }, { id: 2, term: "Jumper" }];
assert(findDuplicateTerm(list, "JUMPER")?.id === 2, "a duplicate is found whatever its capitals");
assert(findDuplicateTerm(list, "jumper", 2) === undefined, "editing a term does not count as a duplicate of itself");
assert(findDuplicateTerm(list, "firmware") === undefined, "a new term is not a duplicate");

const chars = (...rows: Array<[string, string | null]>) => rows.map(([name, firstAppearanceSection]) => ({ name, firstAppearanceSection }));
const slugs = ["bab-1", "bab-2", "bab-3"];
assert(characterProblems(chars(["Alia", "bab-1"], ["Maryam", "bab-2"]), slugs).length === 0, "a valid list has no problems");
assert(characterProblems(chars(["Alia", "bab-99"]), slugs).length === 1, "a chapter that does not exist is a problem");
assert(characterProblems(chars(["Alia", "bab-99"]), []).length === 0, "a work without chapters leaves the value alone");
assert(characterProblems(chars(["Alia", null], ["Maryam", ""]), slugs).length === 0, "no first appearance recorded is allowed");
assert(characterProblems(chars(["Alia", "bab-1"], ["ALIA ", "bab-2"]), slugs).length === 1, "the same name twice is a problem, whatever its capitals");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
