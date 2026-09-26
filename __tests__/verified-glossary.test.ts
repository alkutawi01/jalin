/**
 * Verified glossary projection tests.
 *
 * Only glossary entries backed by a verified reference source reach the
 * public reader. Unsupported/generated entries and empty glossaries are
 * hidden rather than shown.
 */

import { getWorkBySlug } from "../src/lib/content/workLoader";
import { buildVerifiedGlossary, isVerifiedGlossaryEntry } from "../src/lib/reader/verified-glossary";

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

console.log("verified glossary projection tests\n");

{
  const kerusi = getWorkBySlug("kerusi-di-beranda");
  const glossary = buildVerifiedGlossary(kerusi ?? {});
  const terms = Object.keys(glossary);
  assert(terms.length === (kerusi?.glossary.length ?? -1), "Existing cerpen glossary entries are all verified and unchanged");
  assert(Boolean(glossary["kemerosotan kognitif"]), "Dictionary-sourced cerpen term stays visible");
  assert(Boolean(glossary["tersisa"]), "Editorial Jalin glossary source counts as verified");
}

{
  const gatsby = getWorkBySlug("gatsby-agung");
  const glossary = buildVerifiedGlossary(gatsby ?? {});
  assert(Object.keys(glossary).length === 3, "Sinopsis dictionary glossary terms remain visible");
}

{
  const sinopsis = getWorkBySlug("di-hadapan-singgahsana");
  const glossary = buildVerifiedGlossary(sinopsis ?? {});
  assert(Object.keys(glossary).length === 0, "Unsupported topic-source glossary entries are hidden");
  assert((sinopsis?.glossary.length ?? 0) > 0, "Hidden entries exist in source content but not in reader");
}

{
  assert(!isVerifiedGlossaryEntry({ term: "contoh", meaning: "erti", source: "" }), "Entry without source is hidden");
  assert(!isVerifiedGlossaryEntry({ term: "contoh", meaning: "", source: "Kamus Dewan" }), "Entry without meaning is hidden");
  assert(!isVerifiedGlossaryEntry({ term: "", meaning: "erti", source: "Kamus Dewan" }), "Entry without term is hidden");
  assert(isVerifiedGlossaryEntry({ term: "contoh", meaning: "erti", source: "Kamus Dewan / PRPM" }), "Kamus-sourced entry is verified");
}

{
  const empty = buildVerifiedGlossary({ glossary: [] });
  assert(Object.keys(empty).length === 0, "Empty glossary stays empty (nothing generated)");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
