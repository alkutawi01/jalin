/**
 * SourceWork Reader Tests (Phase 4D-0.5)
 *
 * Markdown loader parses sourceWork from frontmatter; reader metadata
 * displays original source attribution for derivative entries (fragmen/
 * sinopsis) and preserves existing display for original Jalin works.
 */

import fs from "node:fs";
import path from "node:path";
import { buildSourceAttribution } from "../src/lib/content/source-attribution";
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
  const display = buildSourceAttribution(asli ?? {});
  assert(display.sumberAsal === null, "Original cerpen shows no source attribution row");
  assert(display.status === "Karya asli Jalin", "Original Jalin cerpen still displays Jalin author");
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
  const display = buildSourceAttribution(sinopsis ?? {});
  assert(
    display.sumberAsal === "The Great Gatsby · F. Scott Fitzgerald",
    "Sinopsis displays original source"
  );
  assert(display.status === "public_domain", "Sinopsis displays source status");
}

{
  const fragmen = getWorkBySlug("nadi-kota-tua-bilik-kiri");
  assert(Boolean(fragmen), "Fragmen loads from markdown");
  assert(
    fragmen?.sourceWork?.title === "Nadi Kota Tua" &&
      fragmen?.sourceWork?.author === "Aminah Rahim" &&
      fragmen?.sourceWork?.rightsStatus === "needs_review",
    "Fragmen with sourceWork parses original title, author, and status"
  );
  const display = buildSourceAttribution(fragmen ?? {});
  assert(display.sumberAsal === "Nadi Kota Tua · Aminah Rahim", "Fragmen displays original source");
  assert(display.status === "needs_review", "Fragmen displays source status");
}

{
  const display = buildSourceAttribution({});
  assert(display.sumberAsal === null, "Missing sourceWork → no source attribution row");
  assert(
    display.status === "Karya asli Jalin",
    "Missing sourceWork → existing behavior preserved"
  );
}

{
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/kategori/[type]/[slug]/page.tsx"),
    "utf8"
  );
  assert(pageSource.includes("Sumber asal"), "Reader meta rows include source attribution label");
  assert(pageSource.includes("buildSourceAttribution"), "Reader meta rows wired to source attribution mapping");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
