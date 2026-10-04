/** WCAG 1.4.13: the glossary tooltip can be reached with the pointer without disappearing, and its text selected. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const root = path.join(__dirname, "..", "src");
const component = fs.readFileSync(path.join(root, "components", "reader", "GlossaryTerm.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");

const tooltipRule = css.match(/\.glossary-tooltip \{[^}]*\}/)?.[0] ?? "";
assert(/pointer-events:\s*auto/.test(tooltipRule) && !/pointer-events:\s*none/.test(tooltipRule), "the tooltip receives the pointer (it is not pointer-events: none)");
assert(/scheduleClose\(\)/.test(component) && /setTimeout\(\(\) => setOpen\(false\), \d+\)/.test(component), "leaving the word closes the tooltip after a short delay, not at once");
assert((component.match(/cancelClose\(\)/g) ?? []).length >= 3, "arriving on the word or on the tooltip cancels the pending close");
assert(/tooltipRef\.current\?\.contains\(target\)/.test(component), "a click inside the tooltip (to select its text) does not dismiss it");
assert(/key === "Escape"/.test(component), "Escape still dismisses it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
