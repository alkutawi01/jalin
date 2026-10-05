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
  // The reader page is the route file plus WorkView, which renders it (the editor preview shares WorkView).
  const pageSource = ["src/app/kategori/[type]/[slug]/page.tsx", "src/components/reader/WorkView.tsx"]
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
  assert(
    !pageSource.includes("rightsStatus") && !pageSource.includes("attribution.status"),
    "Reader page never reads/displays the internal rights-review status"
  );
  assert(
    pageSource.includes("originalTitleOf"),
    "Reader page derives the public-facing original title via originalTitleOf"
  );
  assert(
    pageSource.includes('localeCompare(work.title.trim()'),
    "Original title is shown when it differs from the displayed title"
  );
}

{
  const chromeSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/reader/StoryChrome.tsx"),
    "utf8"
  );
  assert(
    chromeSource.includes("story-original-title") && chromeSource.includes("<cite>{originalTitle}</cite>") && !chromeSource.includes("Tajuk asal:"),
    "StoryHead shows the original title in italics, without a label"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
