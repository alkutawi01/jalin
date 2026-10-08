/**
 * Admin UI standard (docs/ADMIN_UI_STANDARD.md, 8 Okt 2026). The admin looked untidy because styles piled up: 14 font sizes, 9 radii,
 * 48 colours written outside the tokens, two button systems and 118 inline style objects. These numbers may only go down. When a change
 * lowers one, lower its ceiling here to the new value so it cannot creep back.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "src/app/admin/admin.css"), "utf8");

function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, found);
    else if (entry.name.endsWith(".tsx")) found.push(full);
  }
  return found;
}
const sources = [...tsxFiles(path.join(root, "src/app/admin")), ...tsxFiles(path.join(root, "src/components/admin"))].map((f) => fs.readFileSync(f, "utf8"));

// Ceilings (the 8 Okt 2026 baseline). Lower them as the admin is tidied.
const CEILING = { fontSizes: 14, radii: 9, hexOutsideTokens: 48, aBtnUses: 11, inlineStyles: 118 };

const distinct = (re: RegExp) => new Set([...css.matchAll(re)].map((m) => m[1]!.trim())).size;
const fontSizes = distinct(/font-size:\s*([^;}]+)/g);
const radii = distinct(/border-radius:\s*([^;}]+)/g);
const rootBlock = (css.match(/:root[^{]*{[^}]*}/) ?? [""])[0];
const inRoot = new Set([...rootBlock.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()));
const hexOutside = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()).filter((h) => !inRoot.has(h)).length;
const count = (re: RegExp) => sources.reduce((n, s) => n + (s.match(re) ?? []).length, 0);
const aBtn = count(/className="[^"]*\ba-btn\b/g);
const inline = count(/style=\{\{/g);

assert(fontSizes <= CEILING.fontSizes, `distinct font sizes in admin.css: ${fontSizes} (ceiling ${CEILING.fontSizes}; the standard is 8)`);
assert(radii <= CEILING.radii, `distinct border radii: ${radii} (ceiling ${CEILING.radii}; the standard is 3)`);
assert(hexOutside <= CEILING.hexOutsideTokens, `colours written outside the tokens: ${hexOutside} (ceiling ${CEILING.hexOutsideTokens}; the standard is 0)`);
assert(aBtn <= CEILING.aBtnUses, `uses of the old a-btn button family: ${aBtn} (ceiling ${CEILING.aBtnUses}; the standard is 0, use admin-btn)`);
assert(inline <= CEILING.inlineStyles, `inline style objects in admin components: ${inline} (ceiling ${CEILING.inlineStyles})`);

const standard = fs.readFileSync(path.join(root, "docs/ADMIN_UI_STANDARD.md"), "utf8");
assert(["Prinsip", "Token", "Komponen", "Angka asas"].every((h) => standard.includes(h)), "the standard document keeps its sections");
assert(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").includes("docs/ADMIN_UI_STANDARD.md"), "AGENTS.md points to the standard");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
