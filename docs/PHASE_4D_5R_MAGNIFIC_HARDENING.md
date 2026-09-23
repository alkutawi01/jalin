# Phase 4D-5R — Magnific Integration Hardening

**Status:** Completed  
**Commit:** (see git log)  
**Supersedes rejection rationale for Phase 4D-5**

## Why 4D-5 Was Rejected

The Director identified four open issues:

1. **Provider-URL fallback in attach** — attachment could fall back to a transient provider URL instead of requiring a stable, finalized asset path.
2. **Unverified Magnific contract** — adapter used invented endpoints, `Authorization: Bearer` auth, and fabricated model names (`magnific-spark`, `magnific-phoenix`, `magnific-velocity`).
3. **No webhook / connector path** — only synchronous polling; no HMAC-signed webhook, no authenticated connector completion endpoint.
4. **Three duplicate `"test"` keys** in `package.json` scripts.

## What 4D-5R Changed

### 1. Official Magnific API Contract (docs.magnific.com)

| Item | Before (4D-5) | After (4D-5R) |
|------|----------------|----------------|
| Base URL | Invented `api.magnific.ai` | `https://api.magnific.com` |
| Endpoint | Invented | `POST /v1/ai/mystic` (active Mystic) |
| Auth header | `Authorization: Bearer` | `x-magnific-api-key` |
| Models | `magnific-spark` etc. (fabricated) | `flexible`, `fluid`, `realism`, `zen`, `super_real`, `editorial_portraits` |
| Aspect ratios | Invented strings | `square_1_1`, `standard_3_2`, `portrait_2_3`, `widescreen_16_9`, `social_story_9_16`, `classic_4_3`, `traditional_3_4` |
| Task poll | N/A | `GET /v1/ai/mystic/{task-id}` |
| Async handling | Sync-only assumption | Submit returns `task_id` + `status`; asset arrives later via webhook/poll/connector |

Request body fields are limited to documented ones (`prompt`, `aspect_ratio`, `model`, `webhook_url`). No invented `width` / `num_images` fields.

### 2. Stable-Asset Attach Gate (`validateAttachGate`)

`attachVisualToWork` (and the admin UI attach button) enforce, in order:

- `status === "approved"` and `approval_state === "approved"` (editorial gate)
- `asset_finalized === true` (durable storage confirmed)
- non-empty `source_asset_path` (canonical local/object path — **never** a provider URL)
- non-Magnific provider rejected
- non-empty `alt_text`
- `visual_role` and provenance present

Provider URLs (`source_asset_url`) remain internal provenance only; they are never used as `src`.

**Storage durability:** On Vercel (ephemeral FS), `storeVisualAsset` sets `asset_finalized = true` only if an object-storage PUT succeeds; local FS writes on Vercel remain `finalized = false`. Minimal AWS SigV4 `PutObject` implemented without adding an SDK dependency (AGENTS.md: no large deps without justification).

### 3. Three Completion Paths → One Service

All three converge on **one** idempotent `completeVisualGeneration()`:

| Path | Endpoint | Notes |
|------|----------|-------|
| API (async Mystic) | Poll / status callback | Bounded poll (`maxAttempts`, default 3) |
| Webhook (primary) | `POST /api/webhooks/magnific` | HMAC-SHA256 over `{webhook-id}.{webhook-timestamp}.{rawBody}`, constant-time compare, 300s replay window, `last_webhook_id` idempotency |
| Connector (authenticated admin) | `POST /api/admin/visual-requests/[id]/complete` | Strict body: `provider="magnific"`, `executionMode="magnific_connector"`, `providerAssetUrl` required |

**All paths:**

- Never auto-approve, auto-attach, or auto-publish.
- Completion lands on `status = "under_review"`, `approval_state = "pending"`.
- Terminal editorial states (`approved` / `attached` / `rejected`) are never clobbered by late callbacks.
- Append-only `attempt_history` (JSON text, migration 009).
- Sanitized error messages (no API keys, no raw provider bodies).

### 4. Lifecycle Separation (Admin UI)

Three clearly separated panels on `/admin/visual-requests/[id]`:

1. **Generation** — status, execution mode, task/creation IDs, dimensions, finalize state, retry count, attempt history (collapsible).
2. **Editorial Review** — approval state, approver.
3. **Attachment** — attached/unattached, work ID, canonical `source_asset_path`, explicit note that attach ≠ publish.

Actions are state-driven: Generate → Poll → Approve/Reject → Attach. Attach button disabled unless `asset_finalized`.

### 5. Retry & Error Policy

- `MAX_VISUAL_RETRY_COUNT = 3` (hard cap; no infinite loops).
- Retryable: `timeout`, `rate_limit`, `provider_error`.
- Not retryable: `auth`, `validation_error`, `webhook_signature_error`.
- Error category `webhook_signature_error` added.

### 6. Migration 009 — `visual_execution_hardening` (additive only)

Recorded migration names are never re-run; new columns/indexes added:

- `execution_mode` TEXT NOT NULL DEFAULT `'magnific_api'`
- `attempt_history` TEXT NOT NULL DEFAULT `'[]'`
- `last_webhook_id` TEXT
- Index: `visual_requests_execution_mode_idx`
- Index: on `last_webhook_id` (or equivalent documented index)

Mirrored in both `scripts/db-schema-migrate.ts` (inline 001–009) and `src/lib/db/migrations/009_visual_execution_hardening.ts`.

### 7. `package.json`

Single `"test"` script (no duplicate keys), chaining:

```
visual-generation → visual-hardening → generation-orchestration → identity-privacy → promotion-workflow
```

### 8. Env / `.env.example`

Documented (placeholders only — no real secrets):

- `MAGNIFIC_API_KEY`
- `MAGNIFIC_WEBHOOK_SECRET`
- `MAGNIFIC_WEBHOOK_URL` (optional override; defaults to `${NEXT_PUBLIC_APP_URL}/api/webhooks/magnific`)
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`

## Test Results (automated, zero Magnific credits)

| Suite | Passed |
|-------|--------|
| visual-generation | 68 |
| visual-hardening | 132 |
| generation-orchestration | 86 |
| identity-privacy | 64 |
| promotion-workflow | 67 |
| **Total** | **417** |

`visual-hardening` covers: official API contract, auth header (no Bearer), model allowlist, aspect-ratio map, request body, task status parsing, mocked submit/poll transport, webhook HMAC (valid/missing/malformed/bad/replay/modified body/multi-sig), connector body validation, stable-asset attach gate (A–E + rejected/alt/empty-path/non-provider), privacy field exclusion, retry bounds, attempt-history parser.

Also green: `npx tsc --noEmit`, `npm run validate-content`, `npm run db:verify` (21/21 columns, 2/2 execution indexes, 18 indexes total).

## Real Magnific Smoke Test (non-public)

One real Mystic submission (non-public asset, not attached to any published Work) to verify live endpoint + auth + async `task_id` round-trip. See report for task ID and outcome. Does not approve, attach, or publish.

**Result:** PASS — task `bb293888-5b9b-42d9-846b-90a11f864306` → `COMPLETED` via `GET /v1/ai/mystic/{id}`.

## Phase 4D-5R2 — Production Stable Asset URL Closure

### Blocker (4D-5R review)

`storeVisualAsset()` discarded `put.url` and returned `stableAssetPath: /assets/visuals/vr-{id}.{ext}` even when the object lived only in object storage. **No** `next.config` rewrite/proxy maps that path in production → on Vercel, `asset_finalized=true` could point `visuals.src` at a 404.

### Fix (canonical strategy: Option A — direct durable object URL)

On successful object PUT:

- `stableAssetPath` = durable object public URL (`${ENDPOINT}/${BUCKET}/${key}`) — i.e. **kept `put.url`**
- Never a local `/assets/...` path when backend is `object_storage`
- Never a Magnific/provider transient URL
- Local FS path only when **not** Vercel and object storage is unavailable/failed

**Public access model:** path-style public URL; bucket/endpoint must be **public-read** for published assets. No expiring signed URLs in `source_asset_path`. Credentials stay server-side only. `objectStorageConfigured()` now rejects non-URL / placeholder endpoints.

**Immutability:** keys are `assets/visuals/vr-{id}-v{version}-{hash8}.{ext}` where `version = retry_count + attempt_history.length + 1` and `hash8` is SHA-256 prefix of content. Regeneration cannot silently overwrite a prior approved object.

### Attach gate regression

Unchanged: `asset_finalized === true` AND non-empty `source_asset_path` AND approved. `visuals.src` = `source_asset_path` only (no provider URL fallback).

### Automated tests (4D-5R2 additions)

- Immutable key format / version & hash isolation
- Object storage success returns durable object URL (`put.url` kept)
- Canonical path never provider URL / never legacy local path when object storage used
- Vercel without object storage → `finalized=false`, no stable path
- Existing attach-gate cases A–E still pass

### Real storage smoke — ARCHITECTURAL BLOCKER (local env)

Local `.env.local` `OBJECT_STORAGE_*` values are literal placeholders (`[SENSITIVE]`, length 11, not a valid URL). `objectStorageConfigured()` correctly returns **false** → storage fails closed (`finalized=false`). Therefore the live object PUT + HTTP retrieval checklist **cannot complete** from this environment until real S3-compatible credentials (public-read bucket) are present in local `.env.local` and/or verified on Vercel.

**Not worked around:** safety rules unchanged (no finalize without durable path; no provider URL as canonical src). Script ready: `npx tsx scripts/storage-smoke.ts` once credentials are real.

### Storage smoke checklist (pending real credentials)

1. provider asset copied to durable storage  
2. `finalized=true`  
3. `source_asset_path` populated  
4. canonical path HTTP success  
5. content is an image  
6. second GET still OK (durable across calls)  
7. not Magnific transient URL  
8–10. no approve/attach/publish (storage-only)

## Guardrails Preserved

- `docs/VISUAL_GENERATION_GUARDRAILS.md` (LOCKED) — generation, edit, approval flows unchanged in intent.
- Generation ≠ Approval ≠ Attachment ≠ Publication.
- Human editorial approval required before any attachment; publication is a separate Work-level action.
- All production imagery goes through Magnific (AGENTS.md rule 15); mock adapter is test-only.
- AI/tool names never exposed publicly; internal `ai_*` fields stripped by `toPublicProjection()`.
- Composed prompts remain internal (not in public content types).

## Files Changed (summary)

- `src/lib/admin/visual-generation/` — `magnific-adapter.ts`, `webhook-verify.ts` (new), `completion-service.ts` (new), `visual-generation-service.ts`, `asset-storage.ts`, `adapter.ts`, `mock-adapter.ts`, `index.ts`
- `src/app/api/webhooks/magnific/route.ts` (new)
- `src/app/api/admin/visual-requests/[id]/{complete,poll,generate,approve,reject,attach}/route.ts`
- `src/app/admin/visual-requests/[id]/page.tsx` — three-panel lifecycle UI, model dropdown, poll handler
- `src/lib/db/migrations/009_visual_execution_hardening.ts` + `scripts/db-schema-migrate.ts`
- `src/lib/db/types.ts`, `scripts/db-verify.ts`
- `__tests__/visual-hardening.test.ts` (new), `__tests__/visual-generation.test.ts`
- `package.json`, `.env.example`
- `docs/PHASE_4D_5R_MAGNIFIC_HARDENING.md` (this file)
