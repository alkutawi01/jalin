/**
 * Glossary projection tests (reader alignment, Phase 4F).
 *
 * Approved contract: glossary entries are term + meaning only.
 * - entries without `source` render (source is neither required nor shown)
 * - provenance is never projected to the reader
 * - entries with legacy `source` continue to render
 * - entries missing term or meaning stay hidden
 * - empty glossary stays empty (nothing invented)
 */

import { getWorkBySlug } from "../src/lib/content/workLoader";
import {
  buildVerifiedGlossary,
  isVerifiedGlossaryEntry,
} from "../src/lib/reader/verified-glossary";

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

console.log("glossary reader projection tests\n");

{
  const kerusi = getWorkBySlug("kerusi-di-beranda");
  const glossary = buildVerifiedGlossary(kerusi ?? { glossary: [] });
  const terms = Object.keys(glossary);
  assert(
    terms.length === (kerusi?.glossary.length ?? -1),
    "Existing cerpen glossary entries all render unchanged",
  );
  assert(Boolean(glossary["kemerosotan kognitif"]), "Existing term stays visible");
}

{
  const gatsby = getWorkBySlug("gatsby-agung");
  const glossary = buildVerifiedGlossary(gatsby ?? { glossary: [] });
  assert(Object.keys(glossary).length === 3, "Sinopsis glossary terms remain visible");
}

{
  const sinopsis = getWorkBySlug("di-hadapan-singgahsana");
  const glossary = buildVerifiedGlossary(sinopsis ?? { glossary: [] });
  assert(
    (sinopsis?.glossary.length ?? 0) > 0 &&
      Object.keys(glossary).length === (sinopsis?.glossary.length ?? -1),
    "Legacy entries with non-dictionary source still render (source no longer gates display)",
  );
}

console.log("contract: term + meaning only, no source gate");

{
  const rendered = buildVerifiedGlossary({
    glossary: [{ term: "mamak", meaning: "Saudara lelaki sebelah ibu." }],
  });
  assert(Boolean(rendered["mamak"]), "6. reader renders glossary entry without source");
  assert(
    rendered["mamak"]?.meaning === "Saudara lelaki sebelah ibu.",
    "meaning reaches the reader intact",
  );
  assert(
    !("source" in (rendered["mamak"] ?? {})),
    "provenance is not projected to the reader",
  );
}

{
  const legacy = buildVerifiedGlossary({
    glossary: [
      { term: "mamak", meaning: "Saudara lelaki sebelah ibu.", source: "Kamus Dewan" },
    ],
  });
  assert(Boolean(legacy["mamak"]), "legacy entry with source still renders");
  assert(
    !("source" in (legacy["mamak"] ?? {})),
    "legacy source is not shown to readers",
  );
}

{
  assert(
    isVerifiedGlossaryEntry({ term: "contoh", meaning: "erti" }),
    "entry without source is displayable",
  );
  assert(
    !isVerifiedGlossaryEntry({ term: "contoh", meaning: "" }),
    "entry without meaning stays hidden",
  );
  assert(
    !isVerifiedGlossaryEntry({ term: "", meaning: "erti" }),
    "entry without term stays hidden",
  );
  assert(
    isVerifiedGlossaryEntry({ term: "contoh", meaning: "erti", source: "Kamus Dewan" }),
    "legacy entry with source remains displayable",
  );
}

{
  const empty = buildVerifiedGlossary({ glossary: [] });
  assert(Object.keys(empty).length === 0, "Empty glossary stays empty (nothing generated)");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
