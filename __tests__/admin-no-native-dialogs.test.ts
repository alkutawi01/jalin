/**
 * The admin asks with its own dialog (confirmAction: named buttons, destructive style, safe focus) and answers with toasts. The browser's
 * confirm / alert / prompt boxes look foreign, cannot be styled, and say "OK" instead of the action. None may be left in the admin.
 * (8 Okt loop: the last one was "Padam gambar ini?" in ChapterImages.)
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const root = path.join(__dirname, "..");

function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, found);
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}
const files = [...tsxFiles(path.join(root, "src/app/admin")), ...tsxFiles(path.join(root, "src/components/admin"))];
// The one place that may fall back to the browser's box: the dialog bus itself, when no host is mounted.
const allowed = (file: string) => file.endsWith(path.join("src", "lib", "admin", "dialogs.ts"));

const native = /\bwindow\.(confirm|alert|prompt)\s*\(|(^|[^.\w])(confirm|alert|prompt)\s*\(/;
const offenders: string[] = [];
for (const file of files) {
  if (allowed(file)) continue;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    if (native.test(code) && !/confirmAction|confirmLabel/.test(code)) offenders.push(`${path.relative(root, file)}:${i + 1}`);
  });
}
assert(offenders.length === 0, `no window.confirm / alert / prompt in the admin (${files.length} files scanned)${offenders.length ? `: ${offenders.join(", ")}` : ""}`);

const images = fs.readFileSync(path.join(root, "src/components/admin/ChapterImages.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(images.includes('confirmAction("Padam gambar ini daripada bab?", { confirmLabel: "Ya, padam gambar", danger: true })'), "deleting a chapter picture asks in the admin dialog, names the action, and is destructive");
assert(images.includes('toast(published ? "Gambar dipadam daripada draf.') && images.includes('"Gambar dipadam."'), "a deleted picture says so (and, on a public work, that readers do not see it until Terbitkan semula)");
assert((images.match(/toast\(text, "error"\)/g) ?? []).length === 2, "a failed upload and a failed delete both show an error toast");
assert(!/Gagal /.test(images), "no 'Gagal ...' wording; 'X tidak dapat ...'");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
