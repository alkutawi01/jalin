/** A sinopsis/fragmen page does not name the original author as its author (Jalin wrote it); it says it is based on the original book. */
import { workJsonLd } from "../src/lib/seo-jsonld";
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const base = { slug: "riyadh", title: "Riyadh", type: "sinopsis", sections: [] };
const derived = JSON.stringify(workJsonLd({ ...base, authors: [], basedOn: { title: "Al-Riyad", authors: ["Sa'd al-Dusari"] } }));
assert(!derived.includes('"author":[{"@type":"Person","name":"Sa\'d al-Dusari"}],"publisher"') && derived.includes('"isBasedOn":{"@type":"Book","name":"Al-Riyad","author":[{"@type":"Person","name":"Sa\'d al-Dusari"}]}'), "a derivative page is based on the original book and does not list its author as the page's author");
assert(JSON.stringify(workJsonLd({ ...base, type: "cerpen", authors: ["Nara Zahin"] })).includes('"author":[{"@type":"Person","name":"Nara Zahin"}]'), "an original work keeps its author");
assert(!JSON.stringify(workJsonLd({ ...base, authors: [], basedOn: { authors: [] } })).includes('"author"') , "no original author: no author at all");
assert(fs.readFileSync(path.join(__dirname, "../src/components/reader/WorkView.tsx"), "utf8").includes("authors: isDerivativeType(work.type) ? []"), "the work page passes it for derivative types");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
