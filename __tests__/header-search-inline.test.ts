/** The header search sits in the same row as the tabs: an icon that grows into a small box, not a panel hanging below. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const chrome = read("src/components/reader/StoryChrome.tsx");
const css = read("src/app/globals.css");
const box = read("src/components/reader/HeaderSearch.tsx");

assert(/<div className="header-main">\s*<SiteNav active=\{active\} className="header-nav" \/>\s*<HeaderSearch/.test(chrome), "the search is in the same row as the tabs, after them");
assert(css.includes(".header-search-panel { position: relative; width: 240px; }") && css.includes(".header-search-field { display: flex;"), "the open box is a small field in the row, not an absolute panel");
assert(/\.header-search-list \{ position: absolute; top: calc\(100% \+ 6px\); right: 0;/.test(css), "only the suggestions hang below the field");
assert(box.includes('placeholder="Cari tajuk atau penulis"') && css.includes(".header-search-input::placeholder { font-size: inherit;"), "the placeholder is short and smaller");
assert(box.includes("{!open ? (") && box.includes("refocus.current"), "the icon is replaced by the field when open, and focus returns to the icon on Escape");

assert(css.includes("@media (min-width: 821px) and (max-width: 1050px) { .header-search-wrap { width: 40px; height: 40px; } .header-search-panel { position: absolute;"), "on a mid-width screen the open field floats over the end of the tabs, so the tabs never push over the wordmark");
assert(css.includes(".site-header:has(.header-search-field:not(.closing)) { background: #18343c;") && css.includes("opacity: 0; visibility: hidden; pointer-events: none;"), "with the search open the whole header bar turns teal and the menu leaves, so the field never lies over a menu link");
assert(css.includes("filter: brightness(0) invert(.97)") && box.includes("closing") && box.includes("CLOSE_MS"), "the logo turns light on the teal bar, and the box shrinks back before it is removed");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
