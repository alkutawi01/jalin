/**
 * Validate-Content Gate Tests (Phase 4D-0 — Validator Adjustment)
 *
 * Derivative editorial entries (fragmen/sinopsis with sourceWork) require
 * original author credit and source attribution, but not editor credit.
 * Original works keep the mandatory human editor gate.
 */

import {
  isDerivativeEntry,
  validateFrontmatter,
} from "../scripts/validate-content.mjs";

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

type Frontmatter = Record<string, unknown>;

function baseWork(overrides: Frontmatter = {}): Frontmatter {
  return {
    id: "JLN-UJI-0001",
    slug: "karya-uji-gate",
    title: "Karya Uji Gate",
    type: "cerpen",
    status: "published",
    credits: [
      { contributor: "izzat-anas", role: "final_editor", byline: false },
    ],
    ...overrides,
  };
}

const authorOnly = [
  { contributor: "guest:Naguib Mahfouz", role: "author", byline: false },
];

const sourceWork = {
  title: "Before the Throne",
  author: "Naguib Mahfouz",
  language: "Arab",
  rightsStatus: "needs_review",
};

console.log("validate-content gate tests (Phase 4D-0)\n");

{
  const errors = validateFrontmatter(
    baseWork({
      type: "cerpen",
      credits: [{ contributor: "izzat-anas", role: "initial_draft", byline: true }],
    }),
    "cerpen-tanpa-editor.md",
    new Set()
  );
  assert(errors.length > 0, "Published cerpen without editor → FAIL");
  assert(
    errors.some((e) => e.field === "credits") && errors.some((e) => e.field === "status"),
    "Cerpen without editor reports both credits and status errors"
  );
}

{
  const errors = validateFrontmatter(
    baseWork({
      id: "JLN-UJI-0002",
      slug: "sinopsis-dengan-sumber",
      type: "sinopsis",
      credits: authorOnly,
      sourceWork,
    }),
    "sinopsis-dengan-sumber.md",
    new Set()
  );
  assert(errors.length === 0, "Published sinopsis with sourceWork + author only → PASS");
}

{
  const errors = validateFrontmatter(
    baseWork({
      id: "JLN-UJI-0003",
      slug: "fragmen-dengan-sumber",
      type: "fragmen",
      credits: authorOnly,
      sourceWork,
    }),
    "fragmen-dengan-sumber.md",
    new Set()
  );
  assert(errors.length === 0, "Published fragmen with sourceWork + author only → PASS");
}

{
  const errors = validateFrontmatter(
    baseWork({
      id: "JLN-UJI-0004",
      slug: "fragmen-tanpa-sumber",
      type: "fragmen",
      credits: authorOnly,
    }),
    "fragmen-tanpa-sumber.md",
    new Set()
  );
  assert(errors.length > 0, "Published derivative without sourceWork → FAIL");
}

{
  const errors = validateFrontmatter(
    baseWork({
      id: "JLN-UJI-0005",
      slug: "sinopsis-tanpa-kredit-pengarang",
      type: "sinopsis",
      credits: [{ contributor: "chatgpt", role: "initial_draft", byline: true }],
      sourceWork,
    }),
    "sinopsis-tanpa-kredit-pengarang.md",
    new Set()
  );
  assert(errors.length > 0, "Published sinopsis with sourceWork but no author credit → FAIL");
}

assert(isDerivativeEntry({ type: "fragmen", sourceWork }) === true, "Fragmen with sourceWork is derivative entry");
assert(isDerivativeEntry({ type: "cerpen", sourceWork }) === false, "Cerpen is never derivative entry");
assert(
  isDerivativeEntry({ type: "sinopsis", sourceWork: { title: "  " } }) === false,
  "Sinopsis with blank sourceWork title is not derivative entry"
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
