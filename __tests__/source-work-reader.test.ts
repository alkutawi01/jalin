/**
 * SourceWork Reader Tests (Phase 4D-0.5)
 *
 * Markdown loader parses sourceWork from frontmatter; the reader may show
 * the original title/language for a derivative entry (fragmen/sinopsis),
 * but must never expose the internal editorial rights-review status
 * (sourceWork.rightsStatus) to public readers.
 */

import fs from "node:fs";
import path from "node:path";
import { getWorkBySlug } from "../src/lib/content/workLoader";

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

console.log("sourceWork reader tests (Phase 4D-0.5)\n");

{
  const asli = getWorkBySlug("kerusi-di-beranda");
  assert(Boolean(asli), "Original Jalin cerpen loads from markdown");
  assert(asli?.sourceWork === undefined, "Original cerpen has no sourceWork");
}

{
  const sinopsis = getWorkBySlug("gatsby-agung");
  assert(Boolean(sinopsis), "Sinopsis loads from markdown");
  assert(
    sinopsis?.sourceWork?.title === "The Great Gatsby" &&
      sinopsis?.sourceWork?.author === "F. Scott Fitzgerald" &&
      sinopsis?.sourceWork?.rightsStatus === "public_domain",
    "Sinopsis with sourceWork parses original title, author, and status"
  );
}

{
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/kategori/[type]/[slug]/page.tsx"),
    "utf8"
  );
  assert(
    !pageSource.includes("rightsStatus") && !pageSource.includes("attribution.status"),
    "Reader page never reads/displays the internal rights-review status"
  );
  assert(
    pageSource.includes("originalTitleOf"),
    "Reader page derives the public-facing original title via originalTitleOf"
  );
  assert(
    pageSource.includes('MALAY_LANGUAGE_NAMES.has'),
    "Original title is only shown when the source language isn't Malay"
  );
}

{
  const chromeSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/reader/StoryChrome.tsx"),
    "utf8"
  );
  assert(
    chromeSource.includes("story-original-title"),
    "StoryHead renders the original title as a distinct, italicized subtitle"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
