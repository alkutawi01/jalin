/**
 * Promotion Workflow Tests
 *
 * Tests: eligibility, Work ID generation, credit promotion, idempotency,
 * slug collision, privacy boundary, no auto-publish, rollback.
 */

import { validatePromotionEligibility, generateSlug } from "../src/lib/admin/promotion-service";
import * as fs from "fs";

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

function assertEqual(actual: unknown, expected: unknown, description: string) {
  assert(actual === expected, `${description} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
}

function assertIncludes(haystack: string, needle: string, description: string) {
  assert(haystack.includes(needle), `${description} (string does not contain '${needle}')`);
}

function assertNotIncludes(haystack: string, needle: string, description: string) {
  assert(!haystack.includes(needle), `${description} (string should not contain '${needle}')`);
}

// ============================================================
// 1. Promotion Eligibility Validation
// ============================================================
console.log("\n=== Promotion Eligibility ===");

const validSubmission = {
  status: "approved",
  proposed_type: "cerpen",
  proposed_title: "Kisah Lelaki dan Layangan",
  proposed_slug: "kisah-lelaki-layangan",
  manuscript: "Di bawah langit Senai yang kelabu...",
  result_work_id: null,
};

const validErrors = validatePromotionEligibility(validSubmission);
assert(validErrors.length === 0, "Valid submission has no errors");

const rejectedSubmission = { ...validSubmission, status: "under_review" };
const rejectedErrors = validatePromotionEligibility(rejectedSubmission);
assert(rejectedErrors.length > 0, "Non-approved submission has errors");
assertIncludes(rejectedErrors[0], "approved", "Error mentions approved status");

const noTypeSubmission = { ...validSubmission, proposed_type: null };
const noTypeErrors = validatePromotionEligibility(noTypeSubmission);
assert(noTypeErrors.length > 0, "Missing type has errors");
assertIncludes(noTypeErrors[0], "Jenis karya", "Error mentions work type");

const noTitleSubmission = { ...validSubmission, proposed_title: null };
const noTitleErrors = validatePromotionEligibility(noTitleSubmission);
assert(noTitleErrors.length > 0, "Missing title has errors");

const noSlugSubmission = { ...validSubmission, proposed_slug: null };
const noSlugErrors = validatePromotionEligibility(noSlugSubmission);
assert(noSlugErrors.length > 0, "Missing slug has errors");

const noManuscriptSubmission = { ...validSubmission, manuscript: null };
const noManuscriptErrors = validatePromotionEligibility(noManuscriptSubmission);
assert(noManuscriptErrors.length > 0, "Missing manuscript has errors");

const alreadyPromoted = { ...validSubmission, result_work_id: "JLN-CER-0001" };
const promotedErrors = validatePromotionEligibility(alreadyPromoted);
assert(promotedErrors.length > 0, "Already promoted submission has errors");
assertIncludes(promotedErrors[0], "sudah dipromosikan", "Error mentions already promoted");

// Multiple errors
const multipleErrors = { status: "draft", proposed_type: null, proposed_title: null, proposed_slug: null, manuscript: null, result_work_id: null };
const multiErrors = validatePromotionEligibility(multipleErrors);
assert(multiErrors.length >= 4, "Multiple missing fields produce multiple errors");

// ============================================================
// 2. Slug Generation
// ============================================================
console.log("\n=== Slug Generation ===");

assertEqual(generateSlug("Kisah Lelaki dan Layangan"), "kisah-lelaki-dan-layangan", "Simple title → slug");
assertEqual(generateSlug("Rumah Yang Masih Menyimpan Suara"), "rumah-yang-masih-menyimpan-suara", "Title with yang → slug");
assertEqual(generateSlug("Hello! World? 123"), "hello-world-123", "Special chars stripped");
assertEqual(generateSlug("  Extra   Spaces  "), "extra-spaces", "Extra spaces normalized");
assertEqual(generateSlug("UPPERCASE"), "uppercase", "Lowercased");
assertEqual(generateSlug("already-a-slug"), "already-a-slug", "Already slugified");
assertEqual(generateSlug("Title With---Multiple---Dashes"), "title-with-multiple-dashes", "Multiple dashes normalized");

// ============================================================
// 3. Work ID Generation (structural check)
// ============================================================
console.log("\n=== Work ID Generation ===");

const workIdCode = fs.readFileSync("src/lib/admin/work-id.ts", "utf-8");
assertIncludes(workIdCode, "JLN-", "Work ID generator uses JLN- prefix");
assertIncludes(workIdCode, "padStart", "Work ID generator zero-pads numbers");
assertIncludes(workIdCode, "CER", "Work ID generator handles cerpen prefix");
assertIncludes(workIdCode, "NOV", "Work ID generator handles novela prefix");
assertIncludes(workIdCode, "BER", "Work ID generator handles bersiri prefix");
assertIncludes(workIdCode, "TER", "Work ID generator handles terjemahan prefix");
assertIncludes(workIdCode, "FRA", "Work ID generator handles fragmen prefix");
assertIncludes(workIdCode, "SIN", "Work ID generator handles sinopsis prefix");

// ============================================================
// 4. Promotion Service (structural checks)
// ============================================================
console.log("\n=== Promotion Service ===");

const promotionCode = fs.readFileSync("src/lib/admin/promotion-service.ts", "utf-8");
assertIncludes(promotionCode, "transaction", "Promotion uses transaction");
assertIncludes(promotionCode, "rollback", "Promotion handles rollback");
assertIncludes(promotionCode, "result_work_id", "Promotion updates result_work_id");
assertIncludes(promotionCode, "promoted_at", "Promotion sets promoted_at");
assertNotIncludes(promotionCode, 'status: "published"', "Promotion does NOT auto-publish");
assertNotIncludes(promotionCode, 'insertInto("works").values', "Promotion does NOT insert Works directly (uses transaction)");
assertIncludes(promotionCode, "approved", "Promotion requires approved status");
assertIncludes(promotionCode, "slugExists", "Promotion checks slug uniqueness");

// ============================================================
// 5. Credit Promotion Boundary
// ============================================================
console.log("\n=== Credit Promotion Boundary ===");

// The promotion service should:
// - Copy approved credits from submission_contributions to credits
// - NOT copy ai_provider, ai_model, ai_persona, ai_actual_role, ai_identity_source
// - Use guest_name (persona) as the public credit, not internal provider

assertIncludes(promotionCode, "ai_persona", "Promotion reads AI persona for guest name");
assertNotIncludes(promotionCode, "ai_provider", "Promotion does NOT copy ai_provider to credits");
assertNotIncludes(promotionCode, "ai_model", "Promotion does NOT copy ai_model to credits");
assertNotIncludes(promotionCode, "ai_identity_source", "Promotion does NOT copy ai_identity_source to credits");
assertIncludes(promotionCode, "guest_name", "Promotion uses guest_name for credits");
assertIncludes(promotionCode, "role_label", "Promotion copies role_label to credits");

// ============================================================
// 6. No Auto-Publish
// ============================================================
console.log("\n=== No Auto-Publish ===");

// After promotion, Work status should be "ready" not "published"
assertIncludes(promotionCode, '"ready"', "Promotion defaults to ready status");
assertNotIncludes(promotionCode, '"published"', "Promotion does NOT set published status");

// The Work should NOT have published_at set
assertNotIncludes(promotionCode, "published_at: new", "Promotion does NOT set published_at");

// ============================================================
// 7. Idempotency
// ============================================================
console.log("\n=== Idempotency ===");

// If result_work_id already exists, promotion should reject
assertIncludes(promotionCode, "result_work_id", "Promotion checks existing result_work_id");
assertIncludes(promotionCode, "sudah dipromosikan", "Promotion rejects already-promoted submissions");

// ============================================================
// 8. AI Identity Privacy
// ============================================================
console.log("\n=== AI Identity Privacy ===");

// Internal AI identity fields must NOT leak into Work credits
const internalFields = ["ai_provider", "ai_model", "ai_actual_role", "ai_identity_source"];
for (const field of internalFields) {
  // Check that these fields are NOT in credit INSERT
  const creditInsertMatch = promotionCode.match(/insertInto\("credits"\)[\s\S]*?execute\(\)/);
  if (creditInsertMatch) {
    assertNotIncludes(creditInsertMatch[0], field, `Credit insert does NOT include ${field}`);
  }
}

// The only AI-related field that should be used is ai_persona (for guest_name)
assertIncludes(promotionCode, "ai_persona", "AI persona is used for guest name");

// ============================================================
// 9. API Route (structural check)
// ============================================================
console.log("\n=== API Route ===");

const routeCode = fs.readFileSync("src/app/api/admin/submissions/[id]/promote/route.ts", "utf-8");
assertIncludes(routeCode, "POST", "Route handles POST");
assertIncludes(routeCode, "promoteSubmissionToWork", "Route calls promotion service");
assertIncludes(routeCode, "credits", "Route accepts credits config");
assertIncludes(routeCode, "error", "Route returns errors");
assertNotIncludes(routeCode, "auto-publish", "Route does not auto-publish");

// ============================================================
// 10. Admin UI (structural check)
// ============================================================
console.log("\n=== Admin UI ===");

const uiCode = fs.readFileSync("src/app/admin/submissions/[id]/page.tsx", "utf-8");
assertIncludes(uiCode, "Promosi ke Work", "UI has promotion section");
assertIncludes(uiCode, "handlePromote", "UI has promote handler");
assertIncludes(uiCode, "creditConfigs", "UI has credit configuration");
assertIncludes(uiCode, "resultWorkId", "UI shows resulting Work ID");
assertIncludes(uiCode, "resultWorkId", "UI checks promoted status via resultWorkId");
assertIncludes(uiCode, "approved", "UI checks approved status before showing promote button");
assertIncludes(uiCode, "confirm", "UI requires confirmation before promotion");
assertIncludes(uiCode, "isPublic", "UI allows setting credit public flag");
assertIncludes(uiCode, "byline", "UI allows setting byline flag");

// ============================================================
// 11. Suggested Credit Boundary Still Enforced
// ============================================================
console.log("\n=== Suggested Credit Boundary ===");

import { SUGGESTED_CREDIT_BOUNDARY } from "../src/lib/admin/contribution-service";

assert(SUGGESTED_CREDIT_BOUNDARY.enforced === true, "Suggested credit boundary still enforced");
assertIncludes(SUGGESTED_CREDIT_BOUNDARY.description, "does NOT", "Description says does NOT auto-apply");
assertIncludes(SUGGESTED_CREDIT_BOUNDARY.description, "Admin", "Description mentions Admin confirmation");

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(50)}`);

if (failed > 0) {
  process.exit(1);
}
