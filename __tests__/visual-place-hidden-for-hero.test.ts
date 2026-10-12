/** "Kedudukan" (before / after a paragraph) is only shown where it means something: an old picture tied to a quoted passage. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const editor = read("src/app/admin/works/[id]/page.tsx");
assert(editor.includes('editingVisual.role !== "hero" && !!editingVisual.anchor && !isImageMarker(editingVisual.anchor) && <div className="admin-form-group">\n                  <label>Kedudukan</label>'), "the work editor shows Kedudukan only for a non-hero picture with an old quoted anchor");

for (const f of ["src/app/admin/visual-requests/[id]/page.tsx", "src/app/admin/visual-requests/new/page.tsx"]) {
  const src = read(f);
  assert(src.includes('{form.visualRole !== "hero" ? (\n          <div className="admin-form-group">\n            <label htmlFor="place">Tempat</label>'), `${f.split("/").slice(-2).join("/")}: Tempat is not asked for a main picture`);
  assert(src.includes('{form.visualRole !== "hero" ? (\n        <div className="admin-form-group">\n          <label htmlFor="anchor">Petikan penanda</label>'), `${f.split("/").slice(-2).join("/")}: the anchor quotation is not asked for a main picture`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
