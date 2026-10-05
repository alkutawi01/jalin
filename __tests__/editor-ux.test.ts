/**
 * Editor-facing behaviour found by simulating a real editor:
 *  - "Edit" in a table opens a form that may be off screen, so it must be scrolled into view;
 *  - saving a credit must not run twice on a double click;
 *  - readiness messages must not show internal names (Work, body, reading_section, works.body, series_entries).
 */
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8");
const readiness = fs.readFileSync(path.join(__dirname, "../src/lib/admin/publication-readiness.ts"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(/scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/.test(page) && page.includes("openEditorKey"), "an opened edit form is scrolled into view");
for (const key of ["editingCredit", "editingGlossary", "editingVisual", "editingSection"]) {
  assert(new RegExp(`openEditorKey[\\s\\S]{0,400}${key}`).test(page), `${key} is covered by the scroll-into-view rule`);
}
assert(page.includes("creditSavingNow.current") && /disabled=\{creditSaving\}/.test(page), "Simpan Kredit is locked while a save runs (a ref, so two quick clicks are caught)");

// every message string passed to issue(...) or built as msg
const messages = [...readiness.matchAll(/(?:issue\(\s*"[a-z_]+",\s*|msg = |message: )([`"])((?:\\.|(?!\1)[\s\S])*)\1/g)].map((m) => m[2]!);
assert(messages.length > 30, `found the readiness messages (${messages.length})`);
const internal = /\bWork\b|reading_section|works\.body|series_entries|\bsort_order\b|is_asset_finalized|creation_id|reviewed_by|\bgrandfather\b|\bgate\b/;
const offenders = messages.filter((m) => internal.test(m));
assert(offenders.length === 0, `no readiness message shows an internal name${offenders.length ? ": " + offenders.slice(0, 3).join(" | ") : ""}`);
assert(!/works\.body|kekal satu Work/.test(page), "the chapter tab does not show database names");

const visualEditor = fs.readFileSync(path.join(__dirname, "../src/components/admin/VisualManuscriptEditor.tsx"), "utf8");
assert(visualEditor.includes("hasSelectedText") && visualEditor.includes("!saved.collapsed"), "selected text becomes the message/e-mail box (only the paragraphs that hold selected words)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
