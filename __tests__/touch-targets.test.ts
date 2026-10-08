/**
 * Touch targets (8 Okt simulation): admin.css has a block "on touch screens every control is at least 44px", but its selectors
 * (`.admin-btn-sm`) were weaker than `.a-shell .admin-btn-sm { min-height: 32px }`, so it never applied and the filter buttons stayed 33px.
 * A rule inside the touch block must be at least as specific as the rule it is meant to override.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/admin/admin.css"), "utf8").replace(/\r\n/g, "\n");

/** Specificity as [ids, classes, elements] of one simple selector (enough for the plain class selectors used here). */
function specificity(selector: string): [number, number, number] {
  const s = selector.trim();
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!not)[\w-]+/g) ?? []).length;
  const elements = (s.replace(/\.[\w-]+|#[\w-]+|\[[^\]]+\]|:[\w-]+(\([^)]*\))?/g, " ").match(/\b[a-z][\w-]*\b/gi) ?? []).length;
  return [ids, classes, elements];
}
const atLeast = (a: [number, number, number], b: [number, number, number]) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];

const start = css.indexOf("@media (pointer: coarse) {");
assert(start > 0, "the touch-screen block exists");
// The block ends at its closing brace at column 0.
const end = css.indexOf("\n}\n", start);
const block = css.slice(start, end + 3);

// Which selectors does the block give a min-height to?
const touchSelectors = [...block.matchAll(/([^{}]+)\{[^{}]*min-height:\s*44px[^{}]*\}/g)].flatMap((m) => m[1]!.split(",").map((x) => x.trim()).filter(Boolean));
assert(touchSelectors.length >= 7, `the block raises ${touchSelectors.length} kinds of control to 44px`);

// The rules outside the block that set a smaller min-height on the same classes
// Comments are not selectors (a comment above a rule would otherwise be read as part of its selector).
const outside = (css.slice(0, start) + css.slice(end + 3)).replace(/\/\*[^]*?\*\//g, "");
for (const selector of touchSelectors) {
  const lastClass = selector.match(/\.[\w-]+$/)?.[0];
  if (!lastClass) continue;
  const rivals = [...outside.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /min-height:\s*(\d+)px/.test(m[2]!) && Number(m[2]!.match(/min-height:\s*(\d+)px/)![1]) < 44)
    .flatMap((m) => m[1]!.split(",").map((x) => x.trim()).filter((x) => x.endsWith(lastClass) && !x.includes(":")));
  for (const rival of rivals) {
    assert(atLeast(specificity(selector), specificity(rival)), `touch rule "${selector}" is at least as specific as "${rival}" (min-height)`);
  }
}

for (const needed of [".a-shell .admin-btn", ".a-shell .admin-btn-sm", ".a-shell .admin-filter-btn", ".a-shell .a-nav-link"]) {
  assert(touchSelectors.includes(needed), `${needed} is 44px on a touch screen`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
