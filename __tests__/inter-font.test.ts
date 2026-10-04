/** The sans-serif the stylesheet names (Inter) is actually loaded, and every declaration reaches it. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const root = path.join(__dirname, "..", "src", "app");
const layout = fs.readFileSync(path.join(root, "layout.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "globals.css"), "utf8");

assert(/from "next\/font\/google"/.test(layout) && /Inter\(/.test(layout), "the root layout loads Inter through next/font");
assert(/variable:\s*"--font-inter"/.test(layout) && /className=\{inter\.variable\}/.test(layout), "the font is exposed as --font-inter on <html>");
const declared = (css.match(/font-family:[^;}]*\bInter\b/g) ?? []);
const wired = declared.filter((d) => d.includes("var(--font-inter)"));
assert(declared.length > 10, `the stylesheet names Inter in many places (${declared.length})`);
assert(wired.length === declared.length, `every declaration that names Inter reads the loaded font (${wired.length}/${declared.length})`);
assert(!/font-family:\s*Inter\b/.test(css), "no declaration starts with a bare, unloaded Inter");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
