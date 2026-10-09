/**
 * The works list (Izzat, 9 Okt 2026: "every row can be shortened; cut long things, tooltip for the whole, click to copy"): one line per work,
 * no sideways scrolling, the title wider than anything else, the ID and link address as copy buttons, cards only on a phone.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const tsx = read("src/components/admin/AdminWorksTable.tsx");
const css = read("src/app/admin/admin.css");

assert(tsx.includes("admin-works-table a-compact-table"), "the works table opts into the one-line layout");
assert(/function CopyChip/.test(tsx) && tsx.includes("navigator.clipboard.writeText") && tsx.includes('execCommand("copy")'), "a copy button copies, with a fallback when the clipboard is not allowed");
assert(tsx.includes("(klik untuk salin)") && tsx.includes("aria-label={`Salin"), "its tooltip has the whole value and says a click copies; a screen reader hears the same");
assert(/<CopyChip value=\{work\.id\}/.test(tsx) && /<CopyChip value=\{work\.slug\}/.test(tsx), "the ID and the link address are copy buttons");
assert(/className="admin-table-title a-cell-clip" title=\{\[work\.title, work\.authors, work\.slug, work\.version\]/.test(tsx), "the title is cut to one line; its tooltip holds title, authors, link address and version");
assert(tsx.includes("colSpan={10}"), "the empty row spans every column");
assert(css.includes("td.admin-table-title { width: 100%; min-width: 120px; }"), "the title takes all the room the other columns leave");
assert(/\.a-copy \{[^}]*text-overflow: ellipsis/.test(css) && /\.a-copy \{[^}]*max-width: 150px/.test(css), "a copy button is cut at 150px");
assert(/@container admin-table \(min-width: 561px\)/.test(css), "above 560px the table is a table again (the cards are for a phone)");
assert(/@container admin-table \(min-width: 561px\) and \(max-width: 759px\)[^]*?a-col-minor/.test(css), "the ID and date drop out of a narrow box before the title shrinks");
assert(/@container admin-table \(min-width: 561px\) and \(max-width: 1199px\)[^]*?a-col-wide/.test(css), "author, link address and version show only when there is room");
assert(/@container admin-table \(max-width: 560px\)[^]*?a-col-wide[^]*?a-col-minor/.test(css), "a phone card keeps title, kind, status and actions only");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
