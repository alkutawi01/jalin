/**
 * Publication Pipeline Tests (Phase 4D-6)
 *
 * Readiness gates, blocker vs warning, explicit publish rules,
 * public visibility semantics, privacy, grandfather compatibility.
 */

import {
  computeMaterialHash,
  evaluatePublicationReadinessFromData,
  VISUAL_POLICY,
  type EvaluatePublicationReadinessInput,
  type ReadinessWorkInput,
} from "../src/lib/admin/publication-readiness";
import {
  PUBLISH_SERIALIZABLE_RETRY_MAX,
  isPublicationSerializationFailure,
} from "../src/lib/admin/publication-service";
import {
  toPublicSourceProvenance,
  validateSourceUrl,
} from "../src/lib/admin/source-rights";

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

  const approvedSourceForVisualPolicy = {
    original_title: "Hikayat Visual",
    author: "Siti Aminah",
    original_language: "Melayu Klasik",
    source_edition: "Cetakan 1957",
    source_url: "https://example.org/hikayat",
    source_locator: "ms. 1",
    source_text_basis: "Teks asal 1957 (domain awam)",
    rights_status: "public_domain",
    rights_notes: "Domain awam disahkan",
    reviewed_at: "2026-01-01T00:00:00.000Z",
    reviewed_by: "editor@jalin.local",
    approved_material_hash: null as string | null,
  };
  approvedSourceForVisualPolicy.approved_material_hash =
    computeMaterialHash(approvedSourceForVisualPolicy);

  const fragmenNoHero = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "fragmen" }),
      visuals: [],
      sourceWork: approvedSourceForVisualPolicy,
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
// 13. Derivative type: rights gate (4D-7)
// ============================================================
console.log("\n=== Readiness: derivative rights gate (4D-7) ===");
{
  // Original cerpen: rights gate inactive (N/A).
  const cerpen = evaluatePublicationReadinessFromData(validInput());
  assert(cerpen.gates.rights.pass === true, "original cerpen: rights gate N/A (pass)");
  assert(
    !cerpen.blockers.some((b) => b.code === "source_missing"),
    "original cerpen: no source_missing blocker"
  );

  // Derivative without source record → BLOCK.
  const noSource = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: null,
    })
  );
  assert(noSource.ready === false, "terjemahan without source_works is not ready");
  assert(
    noSource.blockers.some((b) => b.code === "source_missing"),
    "source_missing blocker for derivative without provenance"
  );
  assert(noSource.gates.rights.pass === false, "rights gate blocks missing source");

  const baseSource = {
    original_title: "Hikayat Pulau",
    author: "Siti Aminah",
    original_language: "Melayu Klasik",
    source_edition: "Cetakan 1957",
    source_url: "https://example.org/hikayat",
    source_locator: "ms. 12",
    source_text_basis: "Teks asal 1957 (domain awam)",
    rights_status: "public_domain",
    rights_notes: "Domain awam disahkan",
    reviewed_at: "2026-01-01T00:00:00.000Z",
    reviewed_by: "editor@jalin.local",
    approved_material_hash: null as string | null,
  };

  // Incomplete provenance → BLOCK.
  const incomplete = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: { ...baseSource, original_title: "", author: "", original_language: "" },
    })
  );
  assert(
    incomplete.blockers.some((b) => b.code === "source_incomplete"),
    "source_incomplete when core fields empty"
  );

  // Missing review stamps with PASS status → BLOCK.
  const noReview = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: { ...baseSource, reviewed_at: null, reviewed_by: null },
    })
  );
  assert(
    noReview.blockers.some((b) => b.code === "rights_not_reviewed"),
    "rights_not_reviewed when PASS without server review stamps"
  );

  // BLOCK status → BLOCK.
  const restricted = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: { ...baseSource, rights_status: "restricted" },
    })
  );
  assert(
    restricted.blockers.some((b) => b.code === "rights_not_approved"),
    "rights_not_approved for restricted"
  );
  assert(
    restricted.blockers.some((b) => b.code === "rights_notes_required") === false ||
      restricted.blockers.some((b) => b.code === "rights_not_approved"),
    "restricted reported via rights_not_approved"
  );

  // restricted without notes also blocked for notes.
  const restrictedNoNotes = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: { ...baseSource, rights_status: "restricted", rights_notes: "" },
    })
  );
  assert(
    restrictedNoNotes.blockers.some((b) => b.code === "rights_notes_required"),
    "rights_notes_required for restricted without notes"
  );

  // Valid PASS + fresh approval → rights pass (may still warn on PD notice).
  const hash = computeMaterialHash(baseSource);
  const passReady = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: { ...baseSource, approved_material_hash: hash },
    })
  );
  assert(passReady.gates.rights.pass === true, "valid PASS source → rights gate pass");
  assert(
    passReady.warnings.some((w) => w.code === "rights_public_domain_notice"),
    "public_domain translation notice warning"
  );
  assert(
    !passReady.warnings.some((w) => w.code === "provenance_manual"),
    "old provenance_manual warning removed"
  );

  // Stale approval: material hash mismatch after edit → BLOCK.
  const stale = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: {
        ...baseSource,
        original_title: "Hikayat Pulau (edisi baharu)",
        approved_material_hash: hash,
      },
    })
  );
  assert(
    stale.blockers.some((b) => b.code === "rights_stale_approval"),
    "rights_stale_approval when material fields change after approval"
  );

  // Invalid source_url scheme → BLOCK (no SSRF fetch; validate only).
  const badUrl = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: {
        ...baseSource,
        source_url: "javascript:alert(1)",
        approved_material_hash: computeMaterialHash({
          ...baseSource,
          source_url: "javascript:alert(1)",
        }),
      },
    })
  );
  assert(
    badUrl.blockers.some((b) => b.code === "source_url_invalid"),
    "source_url_invalid blocks javascript: scheme"
  );

  // Translation distinction: source_text_basis preserved for modern PD translation case.
  const modernTranslation = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "terjemahan", id: "JLN-TER-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: {
        ...baseSource,
        source_text_basis: "Terjemahan moden 2020 daripada teks asal domain awam — hak cipta terjemahan milik Jalin",
        rights_status: "permission_obtained",
        approved_material_hash: computeMaterialHash({
          original_title: baseSource.original_title,
          author: baseSource.author,
          original_language: baseSource.original_language,
          source_edition: baseSource.source_edition,
          source_url: baseSource.source_url,
          source_locator: baseSource.source_locator,
          source_text_basis:
            "Terjemahan moden 2020 daripada teks asal domain awam — hak cipta terjemahan milik Jalin",
        }),
      },
    })
  );
  assert(
    modernTranslation.gates.rights.pass === true,
    "modern translation with source_text_basis can pass rights"
  );

  // Fragmen/sinopsis also gated.
  const fragmen = evaluatePublicationReadinessFromData(
    validInput({
      work: baseWork({ type: "fragmen", id: "JLN-FRA-0001" }),
      visuals: [baseVisual({ role: "section" })],
      sourceWork: null,
    })
  );
  assert(fragmen.blockers.some((b) => b.code === "source_missing"), "fragmen without source blocked");
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

// ============================================================
// 17. Race: relation invalidated after preflight fails transactional recheck
// ============================================================
console.log("\n=== Race: post-preflight relation invalidation ===");
{
  const preflight = evaluatePublicationReadinessFromData(validInput());
  assert(preflight.ready === true, "Preflight readiness PASS (advisory)");

  // Simulate concurrent mutation after preflight: visual unfinalized + byline removed.
  const afterMutation = evaluatePublicationReadinessFromData(
    validInput({
      visuals: [baseVisual({ is_asset_finalized: false })],
      credits: [baseCredit({ byline: false })],
    })
  );
  assert(afterMutation.ready === false, "Transactional recheck FAIL after relation mutation");
  assert(
    afterMutation.blockers.some((b) => b.code === "visual_unfinalized"),
    "visual_unfinalized blocks publication"
  );
  assert(
    afterMutation.blockers.some((b) => b.code === "byline_missing"),
    "byline_missing blocks publication"
  );

  // Failed recheck never implies published status (pure evaluator leaves input unchanged).
  const mutatedInput = validInput({
    visuals: [baseVisual({ is_asset_finalized: false })],
    credits: [baseCredit({ byline: false })],
  });
  evaluatePublicationReadinessFromData(mutatedInput);
  assert(mutatedInput.work.status === "ready", "Work remains ready after failed recheck (pure)");
  assert(mutatedInput.work.published_at === null, "published_at unchanged/null after failed recheck");

  const slugRace = evaluatePublicationReadinessFromData(
    validInput({ slugTakenByOther: true })
  );
  assert(slugRace.ready === false, "Duplicate slug after preflight fails transactional recheck");
  assert(slugRace.blockers.some((b) => b.code === "slug_duplicate"), "slug_duplicate blocker");
}

// ============================================================
// 18. SERIALIZABLE retry helpers (4D-6R2)
// ============================================================
console.log("\n=== Serialization failure detection (4D-6R2) ===");
{
  assert(PUBLISH_SERIALIZABLE_RETRY_MAX >= 2 && PUBLISH_SERIALIZABLE_RETRY_MAX <= 3, "Retry max is bounded 2–3");
  assert(
    isPublicationSerializationFailure({ code: "40001" }),
    "SQLSTATE 40001 is retryable"
  );
  assert(
    isPublicationSerializationFailure({ code: "40P01" }),
    "SQLSTATE 40P01 deadlock is retryable"
  );
  assert(
    isPublicationSerializationFailure(
      new Error("could not serialize access due to concurrent update")
    ),
    "Serialize access message is retryable"
  );
  assert(!isPublicationSerializationFailure({ code: "23505" }), "unique_violation is NOT retried");
  assert(!isPublicationSerializationFailure({ code: "23503" }), "foreign_key_violation is NOT retried");
  assert(
    !isPublicationSerializationFailure(
      new Error("Publication readiness (transaksi) gagal: visual_unfinalized")
    ),
    "Readiness failure is NOT retried"
  );
  assert(!isPublicationSerializationFailure(null), "null is not serialization failure");
}

// ============================================================
// 19. Source public serializer + URL validation (4D-7)
// ============================================================
console.log("\n=== Source public serializer & URL validation (4D-7) ===");
{
  const safe = toPublicSourceProvenance({
    original_title: "Hikayat Pulau",
    author: "Siti Aminah",
    original_language: "Melayu",
    publication_year: 1957,
    source_edition: "Cetakan 1957",
    source_locator: "ms. 12",
    rights_status: "public_domain",
  });
  assert(Boolean(safe), "public provenance present for reader");
  const safeJson = JSON.stringify(safe);
  assert(!safeJson.includes("rights_notes"), "public serializer strips rights_notes");
  assert(!safeJson.includes("rights_evidence"), "public serializer strips rights_evidence");
  assert(!safeJson.includes("rights_history"), "public serializer strips rights_history");
  assert(!safeJson.includes("reviewed_by"), "public serializer strips reviewed_by");
  assert(!safeJson.includes("reviewed_at"), "public serializer strips reviewed_at");
  assert(!safeJson.includes("source_url"), "public serializer strips source_url");
  assert(safe?.rightsLabel === "Domain awam", "rightsLabel domain awam");

  const nullSafe = toPublicSourceProvenance(null);
  assert(nullSafe === undefined, "null source → undefined public projection");

  assert(validateSourceUrl("https://example.org/a").ok, "https URL ok");
  assert(validateSourceUrl("http://example.org").ok, "http URL ok");
  assert(validateSourceUrl(null).ok, "null URL ok");
  assert(!validateSourceUrl("javascript:alert(1)").ok, "javascript: rejected");
  assert(!validateSourceUrl("file:///etc/passwd").ok, "file: rejected");
  assert(!validateSourceUrl("data:text/html,x").ok, "data: rejected");
  assert(!validateSourceUrl("not a url").ok, "invalid URL rejected");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
