/** Source-level guards for the works editor: no silent load failures, no lost "unsaved" flag, no silent tab close. */
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

for (const key of ["sections", "credits", "contributors", "visuals", "glossary", "characters"]) {
  assert(src.includes(`noteLoad("${key}"`), `the ${key} loader reports failure`);
}
assert(src.includes("Cuba semula"), "a failed load offers a retry");
assert(/JSON\.stringify\(formRef\.current\) === JSON\.stringify\(sentForm\)\) \{\s*setDirty\(false\);\s*clearDraft\(window\.localStorage, workId\);/.test(src), "saving only clears 'unsaved' (and the browser copy) when nothing was typed meanwhile");
assert(/setSavedBody\(sentForm\.body\)/.test(src), "the saved body is the one that was sent");
assert(/editingCredit \|\| editingVisual \|\| editingGlossary \|\| editingSection/.test(src), "closing the tab warns while a credit/image/glossary/section editor is open");
assert(src.includes("charactersBaseline.current"), "closing the tab warns about unsaved character edits");
assert(src.includes("JSON.stringify(sourceForm) !== sourceBaseline.current") && src.includes("sourceBaseline.current = JSON.stringify(loadedForm)"), "closing the tab warns about an unsaved source/rights form");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
