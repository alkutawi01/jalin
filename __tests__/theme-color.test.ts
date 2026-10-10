/** The browser bar takes the paper colour of the page (10 Oct 2026 UI loop). */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const layout = fs.readFileSync(path.join(__dirname, "../src/app/layout.tsx"), "utf8").replace(/\r\n/g, "\n");
const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const paper = /--paper:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1]?.toLowerCase();

assert(/export const viewport: Viewport = \{[^}]*themeColor: "#fbf8f2"/.test(layout), "the layout sets a theme colour");
assert(paper === "#fbf8f2", "and it is the page paper colour (--paper)");

// The iOS home-screen icon: a 180x180 PNG without transparency, named in the layout.
const icon = fs.readFileSync(path.join(__dirname, "../public/brand/apple-touch-icon.png"));
assert(icon.subarray(1, 4).toString() === "PNG" && icon.readUInt32BE(16) === 180 && icon.readUInt32BE(20) === 180, "the Apple touch icon is a 180x180 PNG");
assert(icon[25] === 2, "and it has no alpha channel (colour type 2, RGB)");
assert(layout.includes('apple: "/brand/apple-touch-icon.png"'), "the layout names it");

// A phone turned sideways keeps its text size, and the light-only site is not darkened by a browser.
assert(/html {[^}]*-webkit-text-size-adjust: 100%[^}]*color-scheme: light/.test(css), "html keeps its text size on rotation and declares the light colour scheme");

// Reduced motion: a net under the per-component rules.
assert(css.replace(/\r\n/g, "\n").includes(".related-work-card:hover, .continue-next:hover, .continue-next:focus-visible,\n  .latest-card:hover, .category-explorer-card:hover, .editorial-pick:hover { transform: none; }"), "a device that asks for less motion does not get cards that lift on hover");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
