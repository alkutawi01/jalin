# PHASE_4D_4_PROMOTION_WORKFLOW.md

**Phase:** 4D-4 — Submission-to-Work Promotion Workflow  
**Status:** COMPLETE  
**Date:** 2026-09-23

## Overview

Controlled editorial workflow that promotes an approved `work_submissions` into a canonical `works` record. Atomic, auditable, safe.

**Promotion ≠ Publication.** Work remains non-public after promotion.

## Promotion Eligibility

A submission may be promoted only when:

| Requirement | Field |
|-------------|-------|
| Status = approved | `status` |
| Work type present | `proposed_type` |
| Title present | `proposed_title` |
| Slug present | `proposed_slug` |
| Manuscript present | `manuscript` |
| Not already promoted | `result_work_id` is null |

Errors returned with actionable admin messages.

## Transaction Flow

```
1. Load submission
2. Validate eligibility
3. Check slug uniqueness
4. Generate Work ID (JLN-{TYPE}-{NNNN})
5. Create Work record (status: "ready")
6. Create approved credits (only included ones)
7. Update submission (result_work_id, promoted_at)
8. Return result
```

**On any failure: ROLLBACK everything. No partial Work creation.**

## Work ID Generation

**Format:** `JLN-{TYPE}-{NNNN}`

| Type | Prefix | Example |
|------|--------|---------|
| cerpen | CER | JLN-CER-0004 |
| novela | NOV | JLN-NOV-0001 |
| bersiri | BER | JLN-BER-0001 |
| terjemahan | TER | JLN-TER-0001 |
| fragmen | FRA | JLN-FRA-0001 |
| sinopsis | SIN | JLN-SIN-0001 |

Sequential against existing production data. Zero-padded to 4 digits.

**File:** `src/lib/admin/work-id.ts`

## Slug Collision Handling

1. Check if submitted slug exists
2. If exists, try `{slug}-{type}` (e.g., `kisah-cerpen`)
3. If that also exists, reject with clear error
4. Admin receives warning when slug is auto-modified

## Credit Promotion

| Source (submission_contributions) | Destination (credits) | Behavior |
|-----------------------------------|----------------------|----------|
| `ai_persona` | `guest_name` | Used as public credit name |
| `role_label` | `role_label` | Copied as-is |
| `contributor_slug` | `contributor_slug` | Copied if provided |
| `guest_name` | `guest_name` | Used if no ai_persona |
| `ai_provider` | — | **NOT copied** |
| `ai_model` | — | **NOT copied** |
| `ai_actual_role` | — | **NOT copied** |
| `ai_identity_source` | — | **NOT copied** |

**Admin controls per credit:**
- include/exclude
- final roleLabel
- isPublic flag
- byline flag
- sortOrder

## AI Identity Privacy

Internal AI identity fields (provider, model, actual_role, identity_source) are **NEVER copied** into Work credits. Only the public persona name (`ai_persona`) is used as `guest_name`.

## Promotion vs Publication

| Action | Creates Work? | Sets Status | public? | published_at? |
|--------|--------------|-------------|---------|---------------|
| Promote | Yes | "ready" | No | null |
| Publish | No | "published" | Yes | now() |

Work must still go through the existing editorial publish action.

## Idempotency

- If `result_work_id` already exists → reject with clear error
- Never creates duplicate Works
- Safe against double-click, retry, repeated API call

## API Route

**POST** `/api/admin/submissions/[id]/promote`

```json
{
  "slug": "optional-custom-slug",
  "status": "ready",
  "credits": [
    {
      "contributionId": 1,
      "include": true,
      "roleLabel": "Penulis Draf",
      "isPublic": true,
      "byline": true,
      "sortOrder": 1,
      "contributorSlug": null,
      "guestName": "Rafiq Naim"
    }
  ],
  "promotedBy": "admin"
}
```

**Response:**
```json
{
  "workId": "JLN-CER-0004",
  "slug": "kisah-lelaki-layangan",
  "status": "ready",
  "promotedCreditCount": 1,
  "warnings": []
}
```

## Admin UI

Submission detail page now shows:

- **Promotion eligibility** — status check, missing field warnings
- **Slug override** — auto-generated or manual
- **Credit configuration** — per-credit include/exclude, role, public, byline
- **Promote button** — with confirmation dialog
- **Result** — Work ID link after successful promotion
- **Already promoted** — disabled state with Work link

## Audit Trail

Promotion recorded in Work's `editorial_history`:
```json
{
  "version": "v1.0",
  "type": "promotion",
  "summary": "Dipromosikan dari Submission #3",
  "date": "2026-09-23T...",
  "submissionId": 3
}
```

## Tests

**File:** `__tests__/promotion-workflow.test.ts`

| Test Category | Count | Status |
|---------------|-------|--------|
| Promotion Eligibility | 11 | ✅ PASS |
| Slug Generation | 7 | ✅ PASS |
| Work ID Generation | 8 | ✅ PASS |
| Promotion Service | 8 | ✅ PASS |
| Credit Promotion Boundary | 6 | ✅ PASS |
| No Auto-Publish | 3 | ✅ PASS |
| Idempotency | 2 | ✅ PASS |
| AI Identity Privacy | 5 | ✅ PASS |
| API Route | 5 | ✅ PASS |
| Admin UI | 9 | ✅ PASS |
| Suggested Credit Boundary | 3 | ✅ PASS |
| **Total** | **67** | **✅ ALL PASS** |

## Validation Results

| Check | Status |
|-------|--------|
| Tests | ✅ PASS (67/67) |
| db:schema:migrate | ✅ PASS (006_add_promoted_at) |
| db:verify | ✅ PASS (17/17) |
| validate-content | ✅ PASS |
| build | ✅ PASS |

## Files Added/Modified

### New Files
- `src/lib/db/migrations/006_add_promoted_at.ts` — migration
- `src/lib/admin/work-id.ts` — canonical Work ID generator
- `src/lib/admin/promotion-service.ts` — atomic promotion service
- `src/app/api/admin/submissions/[id]/promote/route.ts` — promotion API
- `__tests__/promotion-workflow.test.ts` — 67 tests
- `docs/PHASE_4D_4_PROMOTION_WORKFLOW.md` — this document

### Modified Files
- `src/lib/db/types.ts` — added `promoted_at` to WorkSubmissions
- `scripts/db-schema-migrate.ts` — added 006_migration inline
- `src/app/admin/submissions/[id]/page.tsx` — added promotion workflow UI

## Deferred (Phase 4D-5+)

1. Magnific visual generation integration
2. Re-promotion / revision workflow
3. Batch promotion
4. Promotion analytics
