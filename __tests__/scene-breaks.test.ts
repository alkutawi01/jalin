/** What counts as a scene break, and what is left alone. */
import { isSceneBreakLine, normalizeSceneBreaks } from "../src/lib/reader/scene-breaks";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

for (const line of ["---", "***", "___", "* * *", "- - -", "~~~", "###", "# # #", "===", "• • •", "◆ ◆ ◆", "----------", "  * * *  ", "⁂⁂⁂"]) {
  assert(isSceneBreakLine(line), `"${line.trim()}" is a scene break`);
}
for (const line of ["...", "…", "....", "--", "—", "- - ", "**", "## Bab", "#hashtag", "*dia*", "---x", "a --- b", ":::mesej", "[[gambar:1]]", "", "   ", "* * *x"]) {
  assert(!isSceneBreakLine(line), `"${line}" is NOT a scene break`);
}

const tilde = normalizeSceneBreaks("Dia pergi.\n\n~~~\n\nPagi.");
assert(/^Dia pergi\.\n\n---\n\n+Pagi\.$/.test(tilde) && !tilde.includes("~"), "a tilde line becomes ---, so it cannot open a code block", tilde);
const tight = normalizeSceneBreaks("Dia pergi.\n---\nPagi.");
assert(/^Dia pergi\.\n\n---\n\n+Pagi\.$/.test(tight), "--- straight under a sentence gets a blank line, so the sentence is not made a heading", tight);
assert(normalizeSceneBreaks("a\n\n...\n\nb") === "a\n\n...\n\nb", "a line of dots is left exactly as written");
assert(normalizeSceneBreaks("a\n\n:::mesej\nhai\n:::\n\nb") === "a\n\n:::mesej\nhai\n:::\n\nb", "message and e-mail blocks are untouched");
const squeeze = (t: string) => t.replace(/\n{3,}/g, "\n\n");
const once = normalizeSceneBreaks("a\n* * *\nb\n###\nc");
assert(squeeze(normalizeSceneBreaks(once)) === squeeze(once), "running it twice changes nothing that matters");
assert((normalizeSceneBreaks("a\n***\nb").match(/---/g) ?? []).length === 1, "each break becomes exactly one ---");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
