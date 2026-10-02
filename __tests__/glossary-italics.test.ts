/** Glossary italics are marked by hand with *asterisks*; nothing is italicised automatically. */
import { stripItalicMarks, toggleItalicSelection } from "../src/lib/reader/inline-italics";
import { buildVerifiedGlossary } from "../src/lib/reader/verified-glossary";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Ctrl+I on a selection ===");
let r = toggleItalicSelection("tali fan belt enjin", 5, 13);
assert(r.value === "tali *fan belt* enjin" && r.selectionStart === 6 && r.selectionEnd === 14, "wraps the selection and keeps it selected");
r = toggleItalicSelection(r.value, r.selectionStart, r.selectionEnd);
assert(r.value === "tali fan belt enjin", "pressing again removes the marks");
r = toggleItalicSelection("tali *fan belt* enjin", 5, 15);
assert(r.value === "tali fan belt enjin", "selecting the marks themselves also removes them");
r = toggleItalicSelection("abc", 3, 3);
assert(r.value === "abc**" && r.selectionStart === 4 && r.selectionEnd === 4, "with nothing selected a pair is inserted and the caret sits between");

console.log("\n=== Plain text and reader glossary ===");
assert(stripItalicMarks("*fan belt* dan *timing belt*") === "fan belt dan timing belt", "marks are removed for matching");
assert(stripItalicMarks("tiada tanda") === "tiada tanda", "text without marks is unchanged (no automatic italics)");
const g = buildVerifiedGlossary({ glossary: [
  { term: "*fan belt*", meaning: "Tali getah, juga disebut *timing belt*." },
  { term: "zink", meaning: "Logam nipis." }
] });
assert(Object.keys(g).join() === "fan belt,zink", "the reader matches the plain term, so *fan belt* still marks 'fan belt' in the story");
assert(g["fan belt"]!.termDisplay === "*fan belt*", "the marked term is kept for the tooltip");
assert(g["zink"]!.termDisplay === undefined, "a term without marks gets no italic display");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
