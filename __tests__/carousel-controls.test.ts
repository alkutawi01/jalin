/**
 * The homepage carousel's controls were two oversized pills with text arrows on the left and a lone "Jeda" pill pushed to the far right edge.
 * They are now one centred group of small round buttons with drawn arrows and a pause icon (each still has its spoken label).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const tsx = read("src/components/reader/HeroCarousel.tsx");
assert(!tsx.includes(">←<") && !tsx.includes(">→<") && !tsx.includes('"Main" : "Jeda"}\n'), "no text arrows or word button");
assert(tsx.includes('aria-label="Sebelumnya"') && tsx.includes('aria-label="Seterusnya"') && tsx.includes('"Jeda slaid automatik"') && tsx.includes('"Main slaid secara automatik"'), "every control still has a spoken label");
const css = read("src/app/globals.css");
assert(/\.hero-carousel-controls \{[^}]*justify-content: center/.test(css), "the group is centred");
assert(/\.hero-carousel-btn \{[^}]*width: 36px; height: 36px[^}]*border-radius: 50%/.test(css), "the buttons are small circles");
assert(!/\.hero-carousel-pause \{[^}]*margin-left: auto/.test(css), "the pause button is no longer pushed to the far edge");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
