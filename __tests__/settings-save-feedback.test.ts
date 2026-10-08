/**
 * Tetapan (Izzat, 8 Okt): "bila saya tukar label, tak ada butang untuk sahkan; macam mana saya nak tahu berjaya atau gagal?"
 * The text panels saved silently when the editor clicked outside the box and said so at the bottom of the page, out of sight.
 * Now each panel has a Simpan button, says beside it what happened, and shows a toast wherever the page is scrolled.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const panels: [string, string][] = [
  ["Teks halaman awam", "src/components/admin/SiteCopySettings.tsx"],
  ["Nama samaran AI", "src/components/admin/AiPersonaSettings.tsx"]
];
for (const [name, file] of panels) {
  const text = read(file);
  assert(!text.includes("onBlur") && !text.includes("onKeyDown"), `${name}: nothing saves by itself when the box loses focus`);
  assert(text.includes('type="submit"') && text.includes('"Simpan"') && text.includes("onSubmit"), `${name}: a Simpan button (Enter in a box also saves)`);
  assert(text.includes("disabled={busy || changed.length === 0}"), `${name}: Simpan is off when there is nothing to save, and while saving`);
  assert(text.includes("Belum disimpan") && text.includes("perubahan belum disimpan") && text.includes("Tiada perubahan."), `${name}: says which rows are unsaved and how many`);
  assert(text.includes('toast(text, "success")') && text.includes('toast(text, "error")'), `${name}: a toast for success and for failure`);
  assert(text.includes('role={status?.failed ? "alert" : "status"}'), `${name}: the result is announced (alert when it failed)`);
  assert(/tidak dapat disimpan/.test(text), `${name}: the failure says it could not be saved`);
}

// The colour panel applies a choice at once; its result now sits above the list and in a toast
const theme = read("src/components/admin/SiteThemeSettings.tsx");
assert(theme.indexOf("a-save-status") > 0 && theme.indexOf("a-save-status") < theme.indexOf("a-ground-list"), "Warna blok: the result is above the list, not under the last block");
assert(theme.includes('toast(text, "success")') && theme.includes('toast(text, "error")') && theme.includes("Sudah kelihatan di laman awam."), "Warna blok: a toast, and it says the change is already on the public site");
assert(theme.includes("terus menyimpannya"), "Warna blok: the hint says choosing a colour saves it");

// The panels that already had a button also confirm with a toast
for (const file of ["src/components/admin/AudienceBandsSettings.tsx", "src/components/admin/ReaderTypographySettings.tsx", "src/components/admin/PromptEditor.tsx"]) {
  const text = read(file);
  assert(text.includes('toast(') && text.includes('"success"') && text.includes('"error"'), `${file.split("/").pop()}: success and failure also show a toast`);
}

// One wording
const all = panels.map(([, f]) => read(f)).join("\n") + theme;
assert(!/Gagal /.test(all), "no 'Gagal ...' wording; the pattern is 'X disimpan.' / 'X tidak dapat disimpan.'");
assert(read("src/app/admin/admin.css").includes(".a-shell .a-save-status.is-bad"), "the failed status is styled");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
