/**
 * Underlines (Izzat: "kenapa suka sangat buat underline?"). On the public pages only two things were permanently underlined:
 * the breadcrumb, and links inside a paragraph on the About / Privacy / Terms pages, where a thick line with gaps cut through
 * the letters. The breadcrumb now has a line only on hover and focus; a link in a paragraph keeps a thin, soft line (colour
 * alone does not tell a reader it is a link) that darkens on hover and focus.
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const line = (start: string) => css.split("\n").find((l) => l.startsWith(start)) ?? "";

const crumb = line(".series-crumb a, .crumbs a {");
assert(crumb.includes("text-decoration: none"), "the breadcrumb has no permanent line");
assert(css.includes(".crumbs a:focus-visible { text-decoration: underline;") || css.includes(".crumbs a:hover, .crumbs a:focus-visible { text-decoration: underline;"), "...but it appears on hover and on keyboard focus");

const info = line(".info-body a {");
assert(info.includes("text-decoration-thickness: 1px") && info.includes("text-decoration-skip-ink: none") && info.includes("rgba("), "a link in a paragraph has a thin, soft line that does not break around letters");
assert(css.includes(".info-body a:hover, .info-body a:focus-visible { text-decoration-color: currentColor; }"), "the line darkens on hover and focus");

assert(!fs.readFileSync(path.join(__dirname, "../src/app/tentang/page.tsx"), "utf8").includes("\"Maya\""), "the About page uses curly quotes around Maya");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
