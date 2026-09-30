/**
 * Master Parser prompt drift guard.
 *
 * The prompt lives in docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md (governance
 * record) and in src/lib/admin/import/master-parser-prompt.ts (what the admin
 * shows for copying). They must be identical; regenerate the constant with
 * `node scripts/sync-master-parser-prompt.mjs`.
 */

import fs from "node:fs";
import path from "node:path";
import { MASTER_PARSER_PROMPT, MASTER_PARSER_PROMPT_VERSION } from "../src/lib/admin/import/master-parser-prompt";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

console.log("master parser prompt tests\n");

const doc = fs
  .readFileSync(path.join(process.cwd(), "docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md"), "utf8")
  .replace(/\r\n/g, "\n");
const block = doc.match(/````text\n([\s\S]*?)\n````/);

assert(Boolean(block), "docs contain the fenced prompt block");
assert(block?.[1] === MASTER_PARSER_PROMPT, "docs prompt block is identical to the code constant");

const versionInDoc = doc.match(/\*\*Versi\*\* \| (v\d+)/)?.[1];
assert(versionInDoc === MASTER_PARSER_PROMPT_VERSION, `doc version (${versionInDoc}) matches constant (${MASTER_PARSER_PROMPT_VERSION})`);

for (const required of [
  "parserVersion",
  "headingText",
  "visualBible",
  "visualSuggestions",
  "faceTreatment",
  "anchor",
  "Semakan visual:",
  "Tiada medan \"body\" dalam JSON"
]) {
  assert(MASTER_PARSER_PROMPT.includes(required), `prompt mentions "${required}"`);
}

assert(
  MASTER_PARSER_PROMPT.includes("JANGAN masukkan nama watak"),
  "prompt forbids names as glossary terms (first occurrence gets the tooltip)"
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
