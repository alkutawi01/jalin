/**
 * An episode of a series is headed like any other story ("Bersiri · Rumah tangga"), with which episode of which series it
 * is in a quiet line under the dek; and "Episod 1" is an episode number, not a form (Bentuk).
 */
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.join(__dirname, "../src/components/reader/EpisodeView.tsx"), "utf8");
const chrome = fs.readFileSync(path.join(__dirname, "../src/components/reader/StoryChrome.tsx"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(!page.includes("<Crumbs"), "the episode head is no longer a trail of underlined capitals");
assert(/kicker=\{\[typeLabel, genre\]\.filter\(Boolean\)\.join\(" · "\)\}/.test(page), "the kicker is the same plain 'Form · Genre' text as a cerpen");
assert(page.includes("contextLine=") && page.includes("`Episod ${episodeIndex + 1} · `") && !page.includes("daripada"), "the episode number (without a total) and series are in a context line");
assert(/\{ label: "Bentuk", value: typeLabel \}/.test(page), "'Bentuk' is the form only (Bersiri), without the episode number");
assert(/\{ label: "Episod", value: /.test(page), "the episode number has its own row");
assert(chrome.includes("contextLine") && chrome.includes("story-context-line"), "the story head can show a context line under the dek");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
