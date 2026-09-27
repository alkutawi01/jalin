/**
 * Fragmen contract validator regression tests (Phase 4F — mechanical only).
 *
 * Locks the mechanical rules and the approved glossary contract:
 * - glossary: term + meaning only; source/definition rejected;
 *   source NOT required; empty glossary valid; no warning when absent
 * - body >= 2,000 words; known introduction markers rejected
 * - body leakage: frontmatter / provenance / handoff / Magnific prompt
 * - AI cannot be author
 * - sourceWork structure (no type/novelty/reuse checks — human editorial)
 * - visuals: remote rejected, declared local asset must exist, [] valid
 * - creationId structural check only (no Magnific verification claim)
 */

import * as path from "path";
import {
  validateFragmen,
  checkGlossary,
  type FragmenFile,
} from "../scripts/validate-fragmen";

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

const LONG_BODY =
  "Ini ialah petikan daripada novel yang panjang dan terperinci. ".repeat(400);

function makeFile(overrides: Partial<FragmenFile> = {}): FragmenFile {
  return {
    path: "test-fragmen.md",
    slug: "test-fragmen",
    type: "fragmen",
    status: "review",
    title: "Test Fragmen",
    body: LONG_BODY,
    sourceWork: {
      title: "Novel Ujian Satu",
      author: "Penulis Ujian",
      language: "Melayu",
      rightsStatus: "public_domain",
    },
    credits: [
      { contributor: "guest:Penulis Ujian", role: "author", byline: true },
    ],
    glossary: [],
    visuals: [],
    ...overrides,
  };
}

function run(file: FragmenFile) {
  return validateFragmen(file);
}

console.log("fragmen validator regression tests (mechanical)\n");

console.log("glossary contract (term + meaning only)");

{
  const r = run(
    makeFile({
      glossary: [
        { term: "Mamak", meaning: "Saudara lelaki sebelah ibu dalam sistem matrilineal." },
        { term: "Bako", meaning: "Keluarga daripada sebelah bapa." },
      ],
    }),
  );
  assert(r.passed, "glossary without source field PASSES");
  assert(r.warnings.length === 0, "no warning merely because source is absent");
}

{
  const r = run(
    makeFile({
      glossary: [{ term: "Mamak", meaning: "Saudara lelaki sebelah ibu." }],
    }),
  );
  assert(r.passed, "glossary with term + meaning PASSES");
}

{
  const r = run(
    makeFile({
      glossary: [{ term: "Mamak", definition: "Saudara lelaki sebelah ibu." }],
    }),
  );
  assert(!r.passed, "glossary with definition field FAILS");
  assert(
    r.errors.some((e) => e.includes("definition")),
    "reports 'definition' as a disallowed field",
  );
}

{
  const r = run(
    makeFile({
      glossary: [
        { term: "Mamak", meaning: "Saudara lelaki sebelah ibu.", source: "Kamus Dewan" },
      ],
    }),
  );
  assert(!r.passed, "glossary with source field FAILS");
  assert(
    r.errors.some((e) => e.includes("source")),
    "reports 'source' as a disallowed field",
  );
}

{
  const empty = run(makeFile({ glossary: [] }));
  assert(empty.passed, "empty glossary [] PASSES");
  const omitted = run(
    makeFile({ glossary: undefined as unknown as FragmenFile["glossary"] }),
  );
  assert(omitted.passed, "omitted glossary PASSES");
}

{
  const r = run(makeFile({ glossary: [{ term: "", meaning: "erti." }] }));
  assert(!r.passed, "empty term FAILS");
  const r2 = run(makeFile({ glossary: [{ term: "Mamak", meaning: "  " }] }));
  assert(!r2.passed, "empty meaning FAILS");
  const r3 = run(makeFile({ glossary: ["bukan-objek" as unknown as object] }));
  assert(!r3.passed, "malformed glossary entry FAILS");
  assert(checkGlossary("bukan-array").length > 0, "glossary not an array FAILS");
}

console.log("body rules");

{
  const r = run(makeFile());
  assert(r.passed, "clean fragmen PASSES");
  assert(r.errors.length === 0, "clean fragmen produces zero errors");
  assert(r.warnings.length === 0, "clean fragmen produces zero warnings");
}

{
  const r = run(makeFile({ body: "Sedikit teks sahaja." }));
  assert(!r.passed, "body under 2,000 words FAILS");
}

{
  const r = run(makeFile({ body: `## Mukadimah\n\n${LONG_BODY}` }));
  assert(!r.passed, "known introduction marker at body start FAILS");
}

{
  const r = run(
    makeFile({ body: `${LONG_BODY}\n\n### JALIN VISUAL HANDOFF\n- role: hero` }),
  );
  assert(!r.passed, "JALIN VISUAL HANDOFF in body FAILS");
}

{
  const r = run(makeFile({ body: `${LONG_BODY}\n\nMAGNIFIC PROMPT\nhero prompt` }));
  assert(!r.passed, "MAGNIFIC PROMPT in body FAILS");
}

{
  const r = run(makeFile({ body: `${LONG_BODY}\n\nSumber asal: novel XYZ` }));
  assert(!r.passed, "provenance/metadata in body FAILS");
}

{
  const r = run(makeFile({ body: `${LONG_BODY}\n\nrights: public_domain` }));
  assert(!r.passed, "provenance pattern (public_domain) in body FAILS");
}

{
  const r = run(makeFile({ body: `---\n${LONG_BODY}` }));
  assert(!r.passed, "frontmatter separator inside body FAILS");
}

{
  const r = run(makeFile({ body: "" }));
  assert(!r.passed, "empty body FAILS");
}

console.log("credits and sourceWork structure");

{
  const r = run(
    makeFile({
      credits: [{ contributor: "guest:Gemini AI", role: "author", byline: true }],
    }),
  );
  assert(!r.passed, "AI as author credit FAILS");
}

{
  const r = run(makeFile({ credits: [] }));
  assert(!r.passed, "missing credits FAILS");
}

{
  const r = run(
    makeFile({ credits: [{ contributor: "guest:Penulis", role: "editor", byline: false }] }),
  );
  assert(!r.passed, "missing public byline FAILS");
}

{
  const r = run(
    makeFile({ sourceWork: { title: "Novel Ujian Satu", language: "Melayu" } }),
  );
  assert(!r.passed, "sourceWork missing author FAILS");
}

{
  const r = run(makeFile({ sourceWork: undefined as unknown as FragmenFile["sourceWork"] }));
  assert(!r.passed, "missing sourceWork FAILS");
}

console.log("visuals");

{
  const r = run(
    makeFile({
      visuals: [
        { role: "hero", src: "https://cdn.example.com/hero.png", alt: "Pemandangan" },
      ],
    }),
  );
  assert(!r.passed, "remote visual URL FAILS");
}

{
  const r = run(
    makeFile({
      visuals: [{ role: "hero", src: "/visuals/tidak-wujud/hero.png", alt: "Pemandangan" }],
    }),
  );
  assert(!r.passed, "nonexistent declared local visual FAILS");
}

{
  const r = run(makeFile({ visuals: [] }));
  assert(r.passed, "visuals: [] PASSES");
}

{
  const r = run(
    makeFile({
      visuals: [
        {
          role: "hero",
          src: "/visuals/gatsby-kapal-melawan-arus/hero.png",
          alt: "Dermaga",
        },
      ],
    }),
  );
  assert(r.passed, "declared local visual that exists on disk PASSES");
}

{
  const r = run(
    makeFile({
      visuals: [{ role: "hero", src: "/visuals/x/hero.png", alt: "Pemandangan" }],
    }),
  );
  assert(!r.passed, "visual missing alt FAILS");
}

{
  const r = run(
    makeFile({
      visuals: [
        { role: "hero", src: "/visuals/x/hero.png", alt: "Pemandangan", creationId: 12345 },
      ],
    }),
  );
  assert(!r.passed, "non-string creationId FAILS structural check");
}

{
  const r = run(
    makeFile({
      visuals: [
        {
          role: "hero",
          src: "/visuals/gatsby-kapal-melawan-arus/hero.png",
          alt: "Dermaga",
          creationId: "907f5358-6c35-4c3e-8ad8-2a99f88c5f11",
        },
      ],
    }),
  );
  assert(r.passed, "well-formed creationId passes structural validation");
  assert(
    !r.errors.some((e) => e.includes("creationId")),
    "well-formed creationId raises no error (no Magnific verification claim)",
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
