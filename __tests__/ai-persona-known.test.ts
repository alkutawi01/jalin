/** The menu offers each AI with the pen name it writes under once that contributor record exists (Gemini = Jamili Guga, Grok = Irfan Zuhri). */
import fs from "node:fs";
import path from "node:path";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/ai-personas.ts"), "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("const KNOWN_SLUG");
const block = src.slice(start, src.indexOf("};", start));
const expected: Array<[string, string]> = [
  ['ChatGPT: "chatgpt"', "ChatGPT"],
  ['Claude: "nara-zahin"', "Claude"],
  ['"Mimo (OpenCode)": "mimo"', "Mimo"],
  ['Gemini: "jamili-guga"', "Gemini"],
  ['Grok: "irfan-zuhri"', "Grok"]
];
for (const [text, name] of expected) assert(block.includes(text), `${name} starts mapped to its pen name`);
assert(src.includes("KNOWN_SLUG[ai] && contributors.has(KNOWN_SLUG[ai])"), "a mapping applies only when that contributor record exists");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
