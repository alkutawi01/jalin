/** One crop (focus + zoom) per image, read from the database and turned into a style. */
import { cropFromRow, cropStyle } from "../src/lib/reader/crop";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(cropFromRow({}) === undefined, "no crop set: the image stays centred");
assert(cropFromRow({ focus_x: null, focus_y: null, zoom: null }) === undefined, "database nulls mean no crop");
const c = cropFromRow({ focus_x: 20, focus_y: 70, zoom: 150 })!;
assert(c.x === 20 && c.y === 70 && c.zoom === 150, "a crop is read as set");
const half = cropFromRow({ focus_x: 10 })!;
assert(half.x === 10 && half.y === 50 && half.zoom === 100, "what is missing defaults to the centre and no zoom");
const wild = cropFromRow({ focus_x: -5, focus_y: 400, zoom: 999 })!;
assert(wild.x === 0 && wild.y === 100 && wild.zoom === 300, "values are kept within range");
assert(cropStyle(undefined) === undefined, "no crop, no style");
const s = cropStyle({ x: 20, y: 70, zoom: 100 })!;
assert(s.objectPosition === "20% 70%" && s.transform === undefined, "focus only moves the picture inside the frame");
const z = cropStyle({ x: 20, y: 70, zoom: 200 })!;
assert(z.transform === "scale(2)" && z.transformOrigin === "20% 70%", "zoom enlarges around the same point");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
