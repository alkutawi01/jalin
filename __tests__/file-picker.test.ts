/**
 * The browser's own file box says "Choose File / No file chosen" in English on a Malay admin (editor simulation, Oct 2026).
 * Every visible file box in the admin is now the FilePicker: a Malay button and the name of the chosen file beside it.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const picker = read("src/components/admin/FilePicker.tsx");
assert(picker.includes('label = "Pilih fail"') && picker.includes('"Tiada fail dipilih"'), "the button and the empty state are in Malay");
assert(picker.includes('type="file"') && !picker.includes("hidden"), "the real input stays (not the hidden attribute), so the keyboard and screen readers still reach it");
assert(picker.includes("selectedName !== undefined ? selectedName : own") && picker.includes('aria-live="polite"'), "the chosen name is shown, from the page when it keeps the file, and announced");
assert(picker.includes('if (clearAfterPick) e.target.value = ""'), "a picker that sends at once can be asked to forget the file so it can be picked again");

// No admin screen draws the browser's own file box any more (a hidden input inside a button label is fine).
const SOURCES = [
  "src/components/admin/WorkVisualUpload.tsx",
  "src/components/admin/AuthoringForm.tsx",
  "src/app/admin/series/[id]/page.tsx",
  "src/app/admin/visual-requests/[id]/page.tsx"
];
for (const file of SOURCES) {
  const src = read(file);
  assert(src.includes("<FilePicker") && !src.includes('type="file"'), `${file} uses FilePicker, not a bare file input`);
}

const css = read("src/app/admin/admin.css");
assert(css.includes('.a-shell .a-file-picker input[type="file"] { position: absolute; inset: 0;') && css.includes(".a-shell .a-file-picker label:focus-within"), "the input covers the button, and the button shows the keyboard focus");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
