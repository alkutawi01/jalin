/**
 * Quotation marks in a story are shown curved (house style, PPRM) even when the stored text has straight ones: Waktu Sebenar and
 * one cerpen were entered with straight marks. The reader converts them when it renders, with the same cautious function the editor uses.
 */
import fs from "node:fs";
import path from "node:path";
import { smartQuotes } from "../src/lib/admin/smart-quotes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${msg}`, detail ?? "");
  }
}

const markdown = fs.readFileSync(path.join(__dirname, "..", "src/components/reader/StoryMarkdown.tsx"), "utf8");
assert(markdown.includes('import { smartQuotes } from "../../lib/admin/smart-quotes";') && /normalizeSceneBreaks\(smartQuotes\(/.test(markdown), "the reader converts straight quotation marks when it renders a story");

assert(markdown.includes("meaning={smartQuotes(glossary[key].meaning)}"), "a glossary tooltip shows curved marks too");

const line = 'Abah mencari jam itu, membelek, "Esok baru siap, tali kena tukar." Dia mengembalikannya.';
assert(smartQuotes(line) === 'Abah mencari jam itu, membelek, “Esok baru siap, tali kena tukar.” Dia mengembalikannya.', "a dialogue line gets an opening and a closing curved mark", smartQuotes(line));
assert(smartQuotes('"Abah," katanya.') === '“Abah,” katanya.', "a quotation at the start of a paragraph is opened and closed");
assert(smartQuotes("ma'af") === "ma'af", "an apostrophe inside a word is left alone");
assert(smartQuotes("tanpa petikan") === "tanpa petikan", "text without marks is unchanged");
assert(smartQuotes("“sudah melengkung”") === "“sudah melengkung”", "curved marks stay as they are");

console.log(`reader-curly-quotes: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
