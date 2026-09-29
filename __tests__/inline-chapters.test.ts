/**
 * Inline chapter navigation for Markdown novelas: the ids the story page
 * links to must equal the ids StoryMarkdown puts on the headings.
 */

import fs from "node:fs";
import path from "node:path";
import { extractInlineChapters, headingId } from "../src/lib/reader/inline-chapters";

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

console.log("inline chapters tests\n");

assert(headingId("Bab 1: Persoalan Pertama") === "bab-1-persoalan-pertama", "heading id is a latin slug");
assert(headingId("Bab 3: Perkara yang Tidak Boleh Diukur") === "bab-3-perkara-yang-tidak-boleh-diukur", "long heading id");
assert(headingId("Bab 2: Cafe") === headingId("Bab 2: Café"), "diacritics are stripped");

const body = [
  "# Tajuk",
  "",
  "## Bab 1: Awal",
  "",
  "Perenggan satu.",
  "",
  "### Bukan bab",
  "",
  "## Bab 2: Akhir ##",
  "",
  "Perenggan dua. ## bukan tajuk kerana bukan di awal baris"
].join("\n");
const chapters = extractInlineChapters(body);
assert(chapters.length === 2, "only second-level headings are chapters");
assert(chapters[0]?.id === "bab-1-awal" && chapters[0]?.label === "Bab 1: Awal", "first chapter id and label");
assert(chapters[1]?.label === "Bab 2: Akhir", "closing hashes are trimmed from the label");
assert(extractInlineChapters("Tiada tajuk di sini.").length === 0, "no headings, no chapters");

const markdownSource = fs.readFileSync(path.join(process.cwd(), "src/components/reader/StoryMarkdown.tsx"), "utf8");
assert(markdownSource.includes("headingId(plainText(children))"), "StoryMarkdown gives h2 the same id function the list uses");

const novela = fs.readFileSync(path.join(process.cwd(), "content/works/sekuntum-bunga-untuk-alia.md"), "utf8");
assert(extractInlineChapters(novela).length === 10, "the real Markdown novela yields 10 chapters");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
