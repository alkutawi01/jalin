/**
 * One wording for what did not work in the admin (8 Okt loop): "X tidak dapat disimpan." (the standard, docs/ADMIN_UI_STANDARD.md),
 * not "Gagal menyimpan ..." in some 70 places. Failure messages name the thing that failed, so the person knows what to retry.
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
    else if (entry.name.endsWith(".tsx")) found.push(full);
  }
  return found;
}
const files = [...tsxFiles(path.join(root, "src/app/admin")), ...tsxFiles(path.join(root, "src/components/admin"))];

const offenders: string[] = [];
let sentences = 0;
for (const file of files) {
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
    if (/["`>]Gagal /.test(line)) offenders.push(`${path.relative(root, file)}:${i + 1}`);
    sentences += (line.match(/tidak dapat (di|dim|dik|dis|dit|dij|dib|dip|dic|dil|dis)\w+/g) ?? []).length;
  });
}
assert(offenders.length === 0, `no message in the admin begins "Gagal ..." (${files.length} files scanned)${offenders.length ? `: ${offenders.slice(0, 5).join(", ")}` : ""}`);
assert(sentences >= 60, `the failure sentences follow "X tidak dapat dipasifkan." (${sentences} found)`);

// A few of them, as written
const text = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
assert(text("src/components/admin/AuthoringForm.tsx").includes("Arahan tidak dapat disediakan.") && text("src/components/admin/AuthoringForm.tsx").includes("Draf tidak dapat disimpan."), "AuthoringForm: the instruction and the draft say what could not be done");
assert(text("src/components/admin/CopyButton.tsx").includes("Tidak dapat disalin: salin sendiri"), "CopyButton: says to copy by hand");
assert(text("src/components/admin/ExportReportButton.tsx").includes('toast("Laporan tidak dapat dimuat turun.", "error")'), "the report download failure is a sentence ending in a full stop");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
