/** The readiness chips: Privasi, Hak, Struktur and Aliran kerja appear only when they have something to report; an empty draft is not shown four green ticks. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "components", "admin", "WorkStatusPanel.tsx"), "utf8");
assert(src.includes('new Set<keyof ReadinessLike["gates"]>(["content", "credits", "visuals"])'), "only content, credits and visuals are always shown");
assert(src.includes("GATES.filter((gate) => ALWAYS_SHOWN.has(gate.key) || !gatePasses(gate.key)"), "the others are shown when failing or with a warning");
assert(src.includes("warnings?: Issue[]"), "a gate may carry warnings");
assert(src.includes('b.code === "title_placeholder"') && src.includes('b.code === "body_missing"'), "an untouched draft is recognised by its placeholder title and empty text");
assert(src.includes('{!untouched && status !== "archived"'), "and is not shown the list of what is missing");
assert(src.includes("Draf masih kosong."), "it is told, calmly, that the list appears once it starts");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
