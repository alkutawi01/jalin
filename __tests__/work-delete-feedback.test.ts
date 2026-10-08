/**
 * The work page (8 Okt loop): deleting a chapter, a credit or a glossary term worked in silence (the row just vanished), the confirm
 * button said "Ya, teruskan" (what is being continued?), a failure showed only in the section far from the button, and the sentences
 * began "Gagal ...". Now each names its action, says when it is done (and, on a public work, that readers do not see it until the next
 * Terbitkan semula), and a failure also shows a toast.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const page = fs.readFileSync(path.join(__dirname, "..", "src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");

function body(name: string): string {
  const start = page.indexOf(`async function ${name}(`);
  const end = page.indexOf("\n  async function ", start + 10);
  return page.slice(start, end > 0 ? end : start + 3000);
}
const handlers: [string, string, string, string][] = [
  ["handleDeleteSection", "Ya, padam bab", "Bab dipadam.", "Bab tidak dapat dipadam."],
  ["handleDeleteCredit", "Ya, padam kredit", "Kredit dipadam.", "Kredit tidak dapat dipadam."],
  ["handleDeleteGlossary", "Ya, padam istilah", "Istilah glosari dipadam.", "Istilah glosari tidak dapat dipadam."],
  ["handleDeleteVisual", "Padam gambar", "dipadam.", "Gambar tidak dapat dipadam."]
];
for (const [name, label, done, failure] of handlers) {
  const code = body(name);
  assert(code.includes(`confirmLabel: "${label}"`), `${name}: the confirm button names the action ("${label}")`);
  assert(code.includes(done) && code.includes('"success"'), `${name}: says it is done`);
  assert(code.includes(failure), `${name}: the failure sentence is "X tidak dapat dipadam."`);
  assert(code.includes('toast(text, "error")'), `${name}: a failure also shows a toast, not only the line in its section`);
}
for (const name of ["handleDeleteSection", "handleDeleteCredit", "handleDeleteGlossary"]) {
  assert(body(name).includes('form.status === "published" ?') && body(name).includes("Pembaca belum melihat perubahan: tekan Terbitkan semula"), `${name}: on a public work it says readers do not see the change until Terbitkan semula`);
}
assert(!/Ya, teruskan/.test(page), "no confirm button says only 'Ya, teruskan'");
assert(!/Gagal memadam/.test(page), "no 'Gagal memadam ...' wording left on the work page");

// Archiving and deleting the whole work
const archive = body("handleArchive");
assert(archive.includes('confirmLabel: "Ya, arkibkan karya"'), "handleArchive: the confirm button names the action");
assert(/if \(!res\.ok\) \{[^]*?data\.error \|\| "Karya tidak dapat diarkibkan\."/.test(archive) && !archive.includes('throw new Error("Gagal mengarkibkan.")'), "handleArchive: shows the sentence the server gave (e.g. only the owner archives a public work), not a fixed 'Gagal'");
assert(archive.includes('toast("Karya diarkibkan.", "success")') && archive.includes('toast(text, "error")'), "handleArchive: says it is done, and a failure is a toast");
const removeWork = body("handleDeleteWork");
assert(removeWork.includes('toast("Karya dipadam.", "success")') && removeWork.includes("Karya tidak dapat dipadam.") && removeWork.includes('toast(text, "error")'), "handleDeleteWork: says it is done, and a failure is a toast");
assert(page.indexOf('toast("Karya diarkibkan."') < page.indexOf("router.push", page.indexOf('toast("Karya diarkibkan."')), "the toast is raised before the page moves on (the toast host stays in the shell)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
