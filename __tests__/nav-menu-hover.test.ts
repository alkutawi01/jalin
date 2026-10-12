import assert from "node:assert/strict";
import fs from "node:fs";

// 12 Okt 2026 (Izzat): the "Kandungan" menu vanished while the pointer crossed the small gap under the label, so it was hard to click.
const css = fs.readFileSync("src/app/globals.css", "utf8");
const tsx = fs.readFileSync("src/components/reader/NavMenu.tsx", "utf8");

assert.match(css, /\.nav-menu-panel::after \{ content: ""; position: absolute; top: -14px; left: 0; right: 0; height: 14px; \}/, "an invisible strip joins the panel to the label across the gap");
assert.match(tsx, /closeTimer\.current = setTimeout\(\(\) => setOpen\(false\), 250\)/, "the menu closes a moment after the pointer leaves, not at once");
assert.match(tsx, /onMouseEnter=\{\(event\) => \{ cancelClose\(\);/, "coming back cancels the pending close");

console.log("nav menu hover: passed");
