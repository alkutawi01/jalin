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
const CEILING = { fontSizes: 8, radii: 5, hexOutsideTokens: 0, aBtnUses: 0, inlineStyles: 94 };

const distinct = (re: RegExp) => new Set([...css.matchAll(re)].map((m) => m[1]!.trim())).size;
const fontSizes = distinct(/font-size:\s*([^;}]+)/g);
const radii = distinct(/border-radius:\s*([^;}]+)/g);
const rootBlock = (css.match(/:root[^{]*{[^}]*}/) ?? [""])[0];
const inRoot = new Set([...rootBlock.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()));
const hexOutside = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()).filter((h) => !inRoot.has(h)).length;
const count = (re: RegExp) => sources.reduce((n, s) => n + (s.match(re) ?? []).length, 0);
const aBtn = count(/className=(?:"[^"]*|\{`[^`]*)(?<![\w-])a-btn(?:-[\w-]+)?(?![\w-])/g) + (css.match(/\.a-btn(?:-[\w-]+)?(?![\w-])/g) ?? []).length;
const inline = count(/style=\{\{/g);

assert(fontSizes <= CEILING.fontSizes, `distinct font sizes in admin.css: ${fontSizes} (ceiling ${CEILING.fontSizes}: 11, 12, 13, 14, 16, 20, 26, 30)`);
const SCALE = new Set(["11px", "12px", "13px", "14px", "16px", "20px", "26px", "30px", "inherit"]);
const offScale = [...new Set([...css.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1]!.trim()))].filter((v) => !SCALE.has(v));
assert(offScale.length === 0, `every font size is a step of the scale${offScale.length ? `; off the scale: ${offScale.join(", ")}` : ""}`);
assert(radii <= CEILING.radii, `distinct border radii: ${radii} (ceiling ${CEILING.radii}: three sizes, a circle and a pill)`);
assert(/--a-radius-sm:\s*6px/.test(css) && /--a-radius:\s*8px/.test(css) && /--a-radius-lg:\s*12px/.test(css), "the three radius tokens are 6px, 8px and 12px");
assert(![...css.matchAll(/border-radius:\s*(\d+)px/g)].some((m) => !["999"].includes(m[1]!)), "no radius is written as a plain pixel value (only the tokens, 50% and the 999px pill)");
assert(hexOutside <= CEILING.hexOutsideTokens, `colours written outside the tokens: ${hexOutside} (ceiling ${CEILING.hexOutsideTokens}; the standard is 0)`);
assert(aBtn <= CEILING.aBtnUses, `uses of the old a-btn button family: ${aBtn} (ceiling ${CEILING.aBtnUses}; the standard is 0, use admin-btn)`);
assert(inline <= CEILING.inlineStyles, `inline style objects in admin components: ${inline} (ceiling ${CEILING.inlineStyles})`);

const standard = fs.readFileSync(path.join(root, "docs/ADMIN_UI_STANDARD.md"), "utf8");
assert(["Prinsip", "Token", "Komponen", "Angka asas"].every((h) => standard.includes(h)), "the standard document keeps its sections");
assert(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").includes("docs/ADMIN_UI_STANDARD.md"), "AGENTS.md points to the standard");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
