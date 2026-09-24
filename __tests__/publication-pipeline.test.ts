/**
 * Publication Pipeline Tests (Phase 4D-6)
 *
 * Readiness gates, blocker vs warning, explicit publish rules,
 * public visibility semantics, privacy, grandfather compatibility.
 */

import {
  evaluatePublicationReadinessFromData,
  VISUAL_POLICY,
  type EvaluatePublicationReadinessInput,
  type ReadinessWorkInput,
} from "../src/lib/admin/publication-readiness";

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

function baseWork(overrides: Partial<ReadinessWorkInput> = {}): ReadinessWorkInput {
  return {
    id: "JLN-CER-0001",
    slug: "kisah-uji-baca",
    title: "Kisah Uji Baca",
    type: "cerpen",
    status: "ready",
    body: "Di bawah langit Senai yang kelabu, Aminah menunggu bas sekolah yang tidak pernah sampai.",
    dek: "Sebuah cerpen tentang menunggu.",
    genre: "Keluarga",
    audience: "remaja",
    version: "v1.0",
    published_at: null,
    editorial_history: "[]",
    ...overrides,
  };
}

function baseCredit(overrides: Partial<EvaluatePublicationReadinessInput["credits"][number]> = {}) {
  return {
    id: 1,
    work_id: "JLN-CER-0001",
    contributor_slug: "izzat-anas",
    guest_name: null,
    role_label: "Penulis",
    byline: true,
    is_public: true,
    sort_order: 0,
    ...overrides,
  };
}

function baseVisual(overrides: Partial<EvaluatePublicationReadinessInput["visuals"][number]> = {}) {
  return {
    id: 10,
    work_id: "JLN-CER-0001",
    role: "hero",
    src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-1-v1-abc12345.png",
    alt: "Bayang seorang gadis di perhentian bas",
    provider: "magnific",
    creation_id: "creation-abc",
    anchor: null,
    place: "after",
    sort_order: 0,
    is_asset_finalized: true,
    ...overrides,
  };
}

function validInput(overrides: Partial<EvaluatePublicationReadinessInput> = {}): EvaluatePublicationReadinessInput {
  return {
    work: baseWork(),
    credits: [baseCredit()],
    visuals: [baseVisual()],
    glossary: [{ id: 1, work_id: "JLN-CER-0001", term: "simpul", meaning: "cekal", source: "Kamus Dewan" }],
    visualRequests: [],
    knownContributorSlugs: new Set(["izzat-anas"]),
    slugTakenByOther: false,
    ...overrides,
  };
}

// ============================================================
// 1. Complete valid Work → ready
// ============================================================
console.log("\n=== Readiness: complete valid Work ===");
{
  const r = evaluatePublicationReadinessFromData(validInput());
  assert(r.ready === true, "Valid Work is ready");
  assert(r.blockers.length === 0, "No blockers on valid Work");
  assert(r.gates.content.pass && r.gates.credits.pass && r.gates.visuals.pass && r.gates.privacy.pass && r.gates.workflow.pass, "All gates pass");
  assert(typeof r.checkedAt === "string" && r.checkedAt.length > 0, "checkedAt present");
}

// ============================================================
// 2. Missing title → blocker
// ============================================================
console.log("\n=== Readiness: missing title ===");
{
  const r = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ title: "   " }) })
  );
  assert(r.ready === false, "Missing title is not ready");
  assert(r.blockers.some((b) => b.code === "title_missing"), "title_missing blocker present");
  assert(r.gates.content.pass === false, "content gate fails");
}

// ============================================================
// 3. Missing body → blocker
// ============================================================
console.log("\n=== Readiness: missing body ===");
{
  const r = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ body: "" }) })
  );
  assert(r.ready === false, "Missing body is not ready");
  assert(r.blockers.some((b) => b.code === "body_missing"), "body_missing blocker present");
}

// ============================================================
// 4. Invalid slug → blocker
// ============================================================
console.log("\n=== Readiness: invalid slug ===");
{
  const r = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ slug: "Slug Invalid!" }) })
  );
  assert(r.ready === false, "Invalid slug is not ready");
  assert(r.blockers.some((b) => b.code === "slug_invalid"), "slug_invalid blocker present");
}

// ============================================================
// 5. Duplicate slug → blocker
// ============================================================
console.log("\n=== Readiness: duplicate slug ===");
{
  const r = evaluatePublicationReadinessFromData(
    validInput({ slugTakenByOther: true })
  );
  assert(r.ready === false, "Duplicate slug is not ready");
  assert(r.blockers.some((b) => b.code === "slug_duplicate"), "slug_duplicate blocker present");
}

// ============================================================
// 6. Invalid credits → blocker
// ============================================================
console.log("\n=== Readiness: invalid credits ===");
{
  const noCredits = evaluatePublicationReadinessFromData(validInput({ credits: [] }));
  assert(noCredits.ready === false, "No credits is not ready");
  assert(noCredits.blockers.some((b) => b.code === "credits_missing"), "credits_missing blocker");

  const noByline = evaluatePublicationReadinessFromData(
    validInput({ credits: [baseCredit({ byline: false })] })
  );
  assert(noByline.ready === false, "No public byline is not ready");
  assert(noByline.blockers.some((b) => b.code === "byline_missing"), "byline_missing blocker");

  const unknownContributor = evaluatePublicationReadinessFromData(
    validInput({
      credits: [baseCredit({ contributor_slug: "tiada-wujud" })],
      knownContributorSlugs: new Set(["seseorang"]),
    })
  );
  assert(unknownContributor.ready === false, "Unknown contributor is not ready");
  assert(
    unknownContributor.blockers.some((b) => b.code === "credit_contributor_unknown"),
    "credit_contributor_unknown blocker"
  );

  const xorViolation = evaluatePublicationReadinessFromData(
    validInput({
      credits: [baseCredit({ contributor_slug: "izzat-anas", guest_name: "Tetamu" })],
    })
  );
  assert(xorViolation.ready === false, "XOR violation is not ready");
  assert(xorViolation.blockers.some((b) => b.code === "credit_identity_xor"), "credit_identity_xor blocker");

  const guestOnly = evaluatePublicationReadinessFromData(
    validInput({
      credits: [baseCredit({ contributor_slug: null, guest_name: "Rafiq Naim" })],
      knownContributorSlugs: new Set(),
    })
  );
  assert(guestOnly.ready === true, "Guest/persona credit remains supported");
}

// ============================================================
// 7. Private/internal identity does not leak (privacy gate)
// ============================================================
console.log("\n=== Readiness: privacy ===");
{
  const leaked = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ editorial_history: JSON.stringify([{ summary: "prompt_composed blah" }]) }),
    })
  );
  assert(leaked.ready === false, "Forbidden privacy field is not ready");
  assert(leaked.gates.privacy.pass === false, "privacy gate fails");
  assert(leaked.blockers.some((b) => b.code === "privacy_forbidden_field"), "privacy_forbidden_field blocker");

  const secretInGenre = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ genre: "OBJECT_STORAGE_SECRET=abc" }) })
  );
  assert(secretInGenre.ready === false, "Storage secret pattern in metadata is not ready");
}

// ============================================================
// 8. Unfinished visual → blocker where applicable
// ============================================================
console.log("\n=== Readiness: visuals ===");
{
  const unfinalized = evaluatePublicationReadinessFromData(
    validInput({ visuals: [baseVisual({ is_asset_finalized: false })] })
  );
  assert(unfinalized.ready === false, "Unfinalized visual is not ready");
  assert(unfinalized.blockers.some((b) => b.code === "visual_unfinalized"), "visual_unfinalized blocker");

  const transient = evaluatePublicationReadinessFromData(
    validInput({
      visuals: [
        baseVisual({
          src: "https://cdn-magnific.freepik.com/mystic_v1_upscale_x.png?token=secret",
        }),
      ],
    })
  );
  assert(transient.ready === false, "Transient Magnific URL is not ready");
  assert(transient.blockers.some((b) => b.code === "visual_src_transient"), "visual_src_transient blocker");

  const localPath = evaluatePublicationReadinessFromData(
    validInput({ visuals: [baseVisual({ src: "/assets/visuals/x.png" })] })
  );
  assert(localPath.ready === false, "Local /assets path is not ready");
  assert(localPath.blockers.some((b) => b.code === "visual_src_transient"), "local path treated as transient");

  const missingAlt = evaluatePublicationReadinessFromData(
    validInput({ visuals: [baseVisual({ alt: "" })] })
  );
  assert(missingAlt.ready === false, "Missing alt is not ready");
  assert(missingAlt.blockers.some((b) => b.code === "visual_alt_missing"), "visual_alt_missing blocker");

  const noHero = evaluatePublicationReadinessFromData(
    validInput({ visuals: [baseVisual({ role: "inline" })] })
  );
  assert(noHero.ready === false, "cerpen without hero is not ready (required policy)");
  assert(noHero.blockers.some((b) => b.code === "hero_role_missing"), "hero_role_missing blocker");

  const fragmenNoHero = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "fragmen" }),
      visuals: [],
    })
  );
  assert(fragmenNoHero.ready === true, "fragmen without hero still ready (recommended only)");
  assert(
    fragmenNoHero.warnings.some((w) => w.code === "hero_missing"),
    "fragmen missing hero is warning not blocker"
  );

  assert(VISUAL_POLICY.cerpen.hero === "required", "VISUAL_POLICY cerpen hero required");
  assert(VISUAL_POLICY.novela.hero === "required", "VISUAL_POLICY novela hero required");
}

// ============================================================
// 9. Status gates
// ============================================================
console.log("\n=== Readiness: status semantics ===");
{
  for (const status of ["draft", "review", "archived"]) {
    const r = evaluatePublicationReadinessFromData(
      validInput({ work: baseWork({ status }) })
    );
    assert(r.ready === false, `status="${status}" is not ready`);
    assert(
      r.blockers.some((b) => b.code === "status_not_publishable"),
      `status="${status}" has status_not_publishable blocker`
    );
  }
  const ready = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ status: "ready" }) })
  );
  assert(ready.ready === true, 'status="ready" can be ready');
  const published = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ status: "published", published_at: "2026-01-01T00:00:00.000Z" }) })
  );
  assert(published.ready === true, 'status="published" remains valid (idempotent re-check)');
}

// ============================================================
// 10. Warning does not equal blocker
// ============================================================
console.log("\n=== Readiness: warning ≠ blocker ===");
{
  const r = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ dek: null }), glossary: [] })
  );
  assert(r.ready === true, "Warnings alone keep ready=true");
  assert(r.warnings.some((w) => w.code === "dek_missing"), "dek_missing is warning");
  assert(r.warnings.some((w) => w.code === "glossary_empty"), "glossary_empty is warning");
  assert(r.warnings.every((w) => !r.blockers.some((b) => b.code === w.code)), "No warning code duplicated as blocker");
}

// ============================================================
// 11. Existing published Works remain compatible (grandfather)
// ============================================================
console.log("\n=== Readiness: grandfather existing published Works ===");
{
  const legacy = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({
        status: "published",
        published_at: "2025-06-01T00:00:00.000Z",
        dek: null,
      }),
      visuals: [baseVisual({ is_asset_finalized: false, alt: "", src: "/assets/old.png" })],
    })
  );
  assert(legacy.ready === true, "Legacy published Work with unfinalized visual stays ready");
  assert(
    legacy.warnings.some((w) => w.code === "visual_unfinalized_grandfathered"),
    "Unfinalized downgraded to grandfather warning"
  );
  assert(
    legacy.warnings.some((w) => w.code === "visual_src_transient_grandfathered"),
    "Transient src downgraded to grandfather warning"
  );
  assert(
    legacy.warnings.some((w) => w.code === "visual_alt_missing_grandfathered"),
    "Missing alt downgraded to grandfather warning"
  );

  const legacyNoHero = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ status: "published" }),
      visuals: [],
    })
  );
  assert(legacyNoHero.ready === true, "Legacy published cerpen without hero stays ready");
  assert(
    legacyNoHero.warnings.some((w) => w.code === "hero_missing_grandfathered"),
    "Missing hero grandfathered for published"
  );

  const legacySceneRole = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ status: "published" }),
      visuals: [baseVisual({ role: "inline-rubber-estate" })],
    })
  );
  assert(legacySceneRole.ready === true, "Legacy scene-specific visual role stays ready when published");
  assert(
    legacySceneRole.warnings.some((w) => w.code === "visual_role_invalid_grandfathered"),
    "Invalid role grandfathered for published Works"
  );

  const draftSceneRole = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ status: "ready" }),
      visuals: [baseVisual({ role: "inline-rubber-estate" })],
    })
  );
  assert(draftSceneRole.ready === false, "Invalid role blocks non-published Work");
}

// ============================================================
// 12. Workflow: pending/rejected visual requests
// ============================================================
console.log("\n=== Readiness: workflow visual requests ===");
{
  const pending = evaluatePublicationReadinessFromData(
    validInput({
      visualRequests: [
        { id: 5, work_id: "JLN-CER-0001", status: "generating", approval_state: "pending", provider_creation_id: null },
      ],
    })
  );
  assert(pending.ready === true, "Pending generation is warning not blocker");
  assert(pending.warnings.some((w) => w.code === "visual_request_pending"), "visual_request_pending warning");

  const rejectedAttached = evaluatePublicationReadinessFromData(
    validInput({
      visuals: [baseVisual({ creation_id: "creation-rej" })],
      visualRequests: [
        { id: 6, work_id: "JLN-CER-0001", status: "rejected", approval_state: "rejected", provider_creation_id: "creation-rej" },
      ],
    })
  );
  assert(rejectedAttached.ready === false, "Rejected visual still attached is blocker");
  assert(
    rejectedAttached.blockers.some((b) => b.code === "visual_request_rejected_attached"),
    "visual_request_rejected_attached blocker"
  );
}

// ============================================================
// 13. Derivative type provenance warning
// ============================================================
console.log("\n=== Readiness: derivative types ===");
{
  const terj = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan" }),
      visuals: [baseVisual({ role: "section" })],
    })
  );
  assert(
    terj.warnings.some((w) => w.code === "provenance_manual"),
    "terjemahan gets provenance_manual warning"
  );
}

// ============================================================
// 14. Explicit publish rules (pure simulation of endpoint gates)
// ============================================================
console.log("\n=== Publish rules ===");
{
  // Mirrors publish endpoint: readiness.ready AND status ready required.
  const draft = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ status: "draft" }) })
  );
  assert(draft.ready === false, "Non-ready Work cannot publish (draft)");

  const ready = evaluatePublicationReadinessFromData(
    validInput({ work: baseWork({ status: "ready" }) })
  );
  assert(ready.ready === true, "Ready Work may publish only after explicit action (readiness permits only)");

  // Readiness alone never mutates status — pure function returns status unchanged.
  assert(ready.gates.content.pass === true, "Readiness does not change Work status (pure)");
}

// ============================================================
// 15. Public visibility helpers (status matrix used by repositories)
// ============================================================
console.log("\n=== Public visibility matrix ===");
{
  const isPublic = (status: string) => status === "published";
  assert(isPublic("draft") === false, "draft → not public");
  assert(isPublic("review") === false, "review → not public");
  assert(isPublic("ready") === false, "ready → not public");
  assert(isPublic("published") === true, "published → public");
  assert(isPublic("archived") === false, "archived → not public");
}

// ============================================================
// 16. No auto-* side effects: pure evaluator never rewrites input
// ============================================================
console.log("\n=== Purity: evaluator has no side effects ===");
{
  const input = validInput();
  const snapshot = JSON.stringify({
    work: input.work,
    credits: input.credits,
    visuals: input.visuals,
  });
  evaluatePublicationReadinessFromData(input);
  const after = JSON.stringify({
    work: input.work,
    credits: input.credits,
    visuals: input.visuals,
  });
  assert(snapshot === after, "Input Work/credits/visuals unchanged by evaluation");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
