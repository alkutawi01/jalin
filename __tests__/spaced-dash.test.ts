/** Em dash display style: a space on each side where it joins prose; interruptions and line openers are left alone. */
import fs from "node:fs";
import path from "node:path";
import { spacedDashes } from "../src/lib/reader/spaced-dash";

let passed = 0;
let failed = 0;
function eq(actual: string, expected: string, msg: string) {
  if (actual === expected) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}\n    got:      ${actual}\n    expected: ${expected}`); }
}
eq(spacedDashes("longkang—masih kelihatan"), "longkang — masih kelihatan", "a tight dash gets a space on each side");
eq(spacedDashes("sendiri — dan sekuntum"), "sendiri — dan sekuntum", "an already spaced dash is unchanged");
eq(spacedDashes("sendiri —dan sekuntum"), "sendiri — dan sekuntum", "a dash with a space on one side is made even");
eq(spacedDashes("Saya cuma—”"), "Saya cuma—”", "a dash that breaks off speech before a closing mark is left tight");
eq(spacedDashes("Saya cuma—"), "Saya cuma—", "a dash at the end of a line is left alone");
eq(spacedDashes("— Kau datang?"), "— Kau datang?", "a dash that opens a line is left alone");
eq(spacedDashes("“Mari—ke sana,” katanya."), "“Mari — ke sana,” katanya.", "a dash inside speech is spaced");
eq(spacedDashes("dia berkata,—“Pergi.”"), "dia berkata, — “Pergi.”", "a dash before an opening mark is spaced");
eq(spacedDashes("a——b"), "a——b", "a double dash is left alone");
eq(spacedDashes("[[imej—satu]] teks—lagi"), "[[imej—satu]] teks — lagi", "an image marker is not touched");
eq(spacedDashes("tiada dash di sini"), "tiada dash di sini", "text without a dash is unchanged");
eq(spacedDashes("baris satu—dua\nbaris tiga—empat"), "baris satu — dua\nbaris tiga — empat", "each line is handled on its own");

const uses = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").includes("spacedDashes");
for (const p of ["src/components/reader/StoryMarkdown.tsx", "src/lib/reader/public-projection.ts", "src/components/reader/HeroCarousel.tsx", "src/components/reader/StoryChrome.tsx"]) {
  if (uses(p)) { passed++; console.log(`  ✓ ${p} applies the spaced dash`); } else { failed++; console.error(`  ✗ ${p} does not apply the spaced dash`); }
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
