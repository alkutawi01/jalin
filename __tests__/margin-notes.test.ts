/** Notes beside the text: where each note is set (right margin below the card, left margin when the right is full, else the list). */
import fs from "node:fs";
import path from "node:path";
import { placeMarginNotes, trackOffsets } from "../src/lib/reader/margin-notes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const opts = { rightFloor: 300, leftFloor: 200, gap: 14, maxShift: 220 };

// level with the line, below the card
const a = placeMarginNotes([{ number: 1, refTop: 800, height: 60 }], opts);
assert(a[0]!.side === "right" && a[0]!.top === 800, "a note sits level with its line in the right margin");
const b = placeMarginNotes([{ number: 1, refTop: 100, height: 60 }], opts);
assert(b[0]!.side === "right" && b[0]!.top === 300, "above the card's bottom it is set just below the card");

// two close notes never overlap
const c = placeMarginNotes([{ number: 1, refTop: 800, height: 60 }, { number: 2, refTop: 820, height: 60 }], opts);
assert(c[1]!.side === "right" && c[1]!.top === 874, "a second note close to the first is set under it, with a gap");

// full: moves to the left, then to the list
const d = placeMarginNotes([{ number: 1, refTop: 800, height: 400 }, { number: 2, refTop: 820, height: 60 }, { number: 3, refTop: 840, height: 60 }], opts);
assert(d[1]!.side === "left" && d[1]!.top === 820, "when the right margin is full at that place only that note goes to the left margin");
assert(d[2]!.side === "left" && d[2]!.top === 894, "and the next one stacks under it on the left");
const e = placeMarginNotes([{ number: 1, refTop: 800, height: 400 }, { number: 2, refTop: 820, height: 60 }], { ...opts, leftFloor: null });
assert(e[1]!.side === "list", "with no left margin (narrow screen) a note that does not fit is left to the list");
const f = placeMarginNotes([{ number: 1, refTop: 800, height: 400 }, { number: 2, refTop: 810, height: 600 }, { number: 3, refTop: 820, height: 60 }, { number: 4, refTop: 830, height: 60 }], opts);
assert(f.map((p) => p.side).join() === "right,left,left,list" || f.map((p) => p.side).join() === "right,left,list,list", "when both margins are full, the note goes to the list, never lost");
const g = placeMarginNotes([{ number: 1, refTop: Number.NaN, height: 60 }], opts);
assert(g[0]!.side === "list", "a note whose number cannot be found is left to the list");
const h = placeMarginNotes([{ number: 1, refTop: 50, height: 60 }], { ...opts, rightFloor: 600, leftFloor: 200 });
assert(h[0]!.side === "left" && h[0]!.top === 200, "a note near the top, under a tall right card, goes left if the left card is shorter");

// where the columns sit
const wide = trackOffsets([180, 720, 180], 40, 1280, "space-between");
assert(wide[0] === 0 && wide[1] === 180 + 40 + 60 && wide[2] === 1280 - 180, "wide: the columns are spread, the right one is flush right");
const mid = trackOffsets([700, 190], 40, 1000, "center");
assert(mid[0] === 35 && mid[1] === 35 + 700 + 40, "narrow: the two columns are centred");

// wiring
const chrome = read("src/components/reader/FootnoteMargin.tsx");
assert(chrome.includes("Escape") && chrome.includes("(max-width: 820px)") && chrome.includes("createPortal"), "a phone gets a box on tap, closed by Escape or a tap elsewhere; its list stays");
assert(read("src/components/reader/WorkView.tsx").includes("<FootnoteMargin") && read("src/components/reader/EpisodeView.tsx").includes("<FootnoteMargin"), "the chapter and the episode page both use it");
const css = read("src/app/globals.css");
assert(css.includes('.footnotes[data-margin="all"]') && css.includes(".has-margin-notes .rail-card.sticky"), "the list is hidden only when notes are in a margin; the side cards stay put");
assert(!css.includes('data-margin="tooltip"') && chrome.includes("on a phone the list at the end of the chapter stays"), "on a phone the list at the end of the chapter is not hidden");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
