/**
 * Saving characters and saving the editor's note/origin both rewrite works.metadata. Run at the same moment, the
 * later write used to drop the earlier one (verified on a Neon branch). Both now read the row under FOR UPDATE.
 */
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/work-service.ts"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const update = src.slice(src.indexOf("export async function updateWork("), src.indexOf("export async function archiveWork"));
const chars = src.slice(src.indexOf("export async function updateWorkCharacters"));
assert(/transaction\(\)[\s\S]*\.forUpdate\(\)/.test(update), "note/origin save reads metadata under a row lock");
assert(/transaction\(\)[\s\S]*\.forUpdate\(\)/.test(chars), "character save reads metadata under a row lock");
assert(!/\.\.\.\(existing\.metadata/.test(chars), "character save no longer merges into a stale copy");

const sr = fs.readFileSync(path.join(__dirname, "../src/lib/admin/source-rights.ts"), "utf8");
const unlocked = sr.split("\n").filter((l) => /selectFrom\("works"\)[^\n]*select\("metadata"\)/.test(l) && !/forUpdate\(\)/.test(l));
assert(unlocked.length === 0, "source-rights never reads works.metadata for a rewrite without a row lock");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
