/**
 * "Riyadh: November 90" was published with its hero's alt left empty, and readers got alt="": a screen reader skipped the one
 * picture of the story. A work's hero with no alt is now named after the work, as a series' hero already was.
 */
import fs from "node:fs";
import path from "node:path";
import { withHeroAlt } from "../src/lib/content/database-repository";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

const visuals = [
  { role: "hero", src: "a.png", alt: "" },
  { role: "inline", src: "b.png", alt: "" },
  { role: "section", src: "c.png", alt: "  " },
];
const named = withHeroAlt(visuals, "Riyadh: November 90");
assert(named[0]!.alt === "Ilustrasi Riyadh: November 90", "a hero with no alt is named after the work", named[0]);
assert(named[1]!.alt === "" && named[2]!.alt === "  ", "a picture inside the text keeps the empty alt its editor left (decorative)");
assert(withHeroAlt([{ role: "hero", src: "a.png", alt: "Seorang lelaki di jeti." }], "X")[0]!.alt === "Seorang lelaki di jeti.", "an alt the editor wrote is kept");
assert(withHeroAlt([{ role: "hero", src: "a.png", alt: " " }], "X")[0]!.alt === "Ilustrasi X" && withHeroAlt(visuals, "  ")[0]!.alt === "", "blank counts as empty; a work with no title is left alone");
assert(visuals[0]!.alt === "", "the list given is not changed");

const source = fs.readFileSync(path.join(__dirname, "..", "src/lib/content/database-repository.ts"), "utf8");
assert((source.match(/withHeroAlt\(/g) ?? []).length === 3, "both ways a work reaches readers (the live record and the published version) use it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
