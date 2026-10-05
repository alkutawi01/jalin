/**
 * Audit finding: /kategori/cerpen/<slug>/<anything> (also fragmen and sinopsis) answered 200 with the whole work, so every work had
 * unlimited duplicate addresses. Only a work with chapters has a second path segment; for any other work it is a 404.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const view = fs.readFileSync(path.join(__dirname, "../src/components/reader/WorkView.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(view.includes("if (sections.length === 0 && sectionSlug) notFound();") && view.indexOf("if (sections.length === 0 && sectionSlug) notFound();") < view.indexOf("let activeSection: ReadingSection | undefined;"), "an extra path segment on a work without chapters is a 404");
assert(view.includes("if (!activeSection) notFound();"), "an unknown chapter is still a 404");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
