/** The hover line of a link is a straight line that sweeps in from the left and is drawn back the same way, not the browser's plain underline. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const i = css.indexOf("/* A link's hover line, drawn rather than switched on");
const block = css.slice(i);

assert(i > 0 && block.includes("linear-gradient(var(--clay), var(--clay))"), "the line is a straight clay line");
assert(block.includes("background-size: 0% 1.8px;") && block.includes("background-size: 100% 1.8px;"), "it grows from nothing to the full width of the words");
assert((block.match(/background-position: /g) ?? []).length === 1 && block.includes("background-position: 0% 100%;"), "it is anchored at the left both ways, so it leaves the way it came (reversed), not out to the right");
assert(block.includes("box-decoration-break: clone"), "it follows a title across wrapped lines");
for (const sel of [".series-feature-latest-title", ".search-result-title a", ".story-context-line a", ".crumbs a", ".link-swipe"]) {
  assert(block.includes(`${sel}:hover`), `${sel} uses it on hover and focus`);
}
assert(/text-decoration: none;\n\s*background-size: 100% 1\.8px;/.test(block), "the plain underline is off while the line shows");
assert(block.includes(".series-feature-latest-title { justify-self: start; }"), "the grid-item title is only as wide as its words");
assert(/prefers-reduced-motion: reduce\) \{[^}]*transition: none;/.test(block), "reduced motion: it appears without sweeping");

const brush = block.slice(block.indexOf("--link-brush:"));
assert(brush.includes("fill='%23a76450'") && brush.includes("M0 5.6C20 1.8 60 2.2 100 4.1C60 3.6 22 4.8 0 8.4Z"), "the title brush is a tapered filled stroke, thick at the left");
assert(/\.series-feature-latest-title,\n\.search-result-title a \{\n\s*background-image: var\(--link-brush\);\n\s*background-size: 0% 9px;/.test(brush), "titles use the brush, small links keep the line");
assert(!/\.crumbs a[^{]*\{[^}]*--link-brush/.test(brush) && !brush.includes(".story-context-line a {"), "the breadcrumb and context line do not take the brush");
assert(!block.includes("background-position: 100%"), "nothing anchors the line at the right, so it is rubbed out from the right back to the left");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
